import { GoogleGenAI } from "@google/genai";
import config from "../config";
import { Movie, Show, Theatre, City } from "../models";
import { Op } from "sequelize";

// Initialize Gemini SDK
const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const systemInstruction = `You are a friendly, helpful movie booking assistant for ShowTime Hub.
Your job is to help users find movies, get details, and book tickets.
- ALWAYS use the 'find_movies' tool to check which movies are actually available before recommending them.
- If the user asks for details about a movie, use 'get_movie_details'.
- If the user says they want to book a movie, use 'initiate_booking' and provide the movie title. Do not make up a booking link yourself.
- Keep your answers concise, natural, and conversational in Hinglish or English as the user prefers.`;

const tools: any = [{
  functionDeclarations: [
    {
      name: "find_movies",
      description: "Search for currently active movies playing in cinemas. Can filter by genre or title.",
      parameters: {
        type: "OBJECT",
        properties: {
          genre: {
            type: "STRING",
            description: "Optional. Genre to filter by (e.g. Action, Comedy, Sci-Fi)"
          },
          searchQuery: {
            type: "STRING",
            description: "Optional. Title search query"
          },
          city: {
            type: "STRING",
            description: "Optional. Name of the city to find movies playing in"
          }
        }
      }
    },
    {
      name: "get_movie_details",
      description: "Get the full plot, cast, and rating for a specific movie.",
      parameters: {
        type: "OBJECT",
        properties: {
          title: {
            type: "STRING",
            description: "Exact title of the movie"
          }
        },
        required: ["title"]
      }
    },
    {
      name: "initiate_booking",
      description: "Start the booking process for a movie. Returns a booking action for the user interface.",
      parameters: {
        type: "OBJECT",
        properties: {
          movieTitle: {
            type: "STRING",
            description: "Title of the movie the user wants to book"
          }
        },
        required: ["movieTitle"]
      }
    }
  ]
}];

export class AIService {
  static async processChat(message: string, history: any[] = []) {
    try {
      if (!config.geminiApiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }

      // Convert frontend history format to Gemini format
      const contents: any[] = history.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // Add the new user message
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents,
        config: {
          systemInstruction: { parts: [{ text: systemInstruction }] },
          tools: tools,
          temperature: 0.7,
        }
      });

      // Check if the model decided to call a function
      if (response.functionCalls && response.functionCalls.length > 0) {
        const functionCall = response.functionCalls[0];
        const args = functionCall.args;
        let functionResponseData: any = {};
        let actionPayload: any = null;

        if (functionCall.name === "find_movies") {
          functionResponseData = await this.executeFindMovies(args);
        } else if (functionCall.name === "get_movie_details") {
          functionResponseData = await this.executeGetMovieDetails(args);
        } else if (functionCall.name === "initiate_booking") {
          const bookingResult = await this.executeInitiateBooking(args);
          functionResponseData = bookingResult;
          if (bookingResult.success) {
            actionPayload = { type: 'BOOKING_INTENT', data: bookingResult.movie };
          }
        }

        // Send the function response back to Gemini to get the final natural language answer
        const followUpContents: any[] = [...contents];
        if (response.candidates && response.candidates[0]) {
          followUpContents.push(response.candidates[0].content); // Add assistant's tool call
        }
        followUpContents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: functionCall.name,
              response: functionResponseData
            }
          }]
        });

        const finalResponse = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: followUpContents,
          config: {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            temperature: 0.7,
          }
        });

        return {
          text: finalResponse.text,
          action: actionPayload
        };
      }

      // If no function call, just return the text
      return { text: response.text, action: null };
    } catch (error: any) {
      console.error("AI Service Error:", error);
      throw new Error(error.message || "Failed to process AI request");
    }
  }

  private static async executeFindMovies(args: any) {
    const whereClause: any = { isActive: true };
    
    if (args.searchQuery) {
      whereClause.title = { [Op.like]: `%${args.searchQuery}%` };
    }

    try {
      const todayString = new Date().toISOString().split('T')[0];
      
      const showInclude: any = {
        model: Show,
        as: "shows",
        required: true,
        where: {
          isActive: true,
          showDate: { [Op.gte]: todayString }
        }
      };

      if (args.city) {
        showInclude.include = [{
          model: Theatre,
          as: "theatre",
          required: true,
          include: [{
            model: City,
            as: "city",
            required: true,
            where: { name: { [Op.like]: `%${args.city}%` } }
          }]
        }];
      }

      console.log("[AI find_movies] arguments:", args);

      const movies = await Movie.findAll({
        where: whereClause,
        limit: 10,
        attributes: ['id', 'title', 'genre', 'language', 'rating'],
        include: [showInclude]
      });

      let filteredMovies = movies;
      if (args.genre) {
        const genreLower = args.genre.toLowerCase();
        filteredMovies = movies.filter(m => 
          m.genre && m.genre.some((g: string) => g.toLowerCase().includes(genreLower))
        );
      }

      console.log(`[AI find_movies] found ${movies.length} movies, after filter: ${filteredMovies.length}`);

      if (filteredMovies.length === 0) {
        return { 
          status: "success", 
          message: "There are no movies currently playing in this city. Tell the user clearly in Hindi: 'Maaf kijiye, abhi is city mein koi movie nahi lagi hai.'" 
        };
      }

      return {
        status: "success",
        movies: filteredMovies.map(m => ({
          title: m.title,
          genre: m.genre.join(', '),
          language: m.language,
          rating: m.rating
        }))
      };
    } catch (err) {
      console.error(err);
      return { status: "error", message: "Database query failed" };
    }
  }

  private static async executeGetMovieDetails(args: any) {
    if (!args.title) return { status: "error", message: "Title is required" };
    
    try {
      const movie = await Movie.findOne({
        where: { title: { [Op.like]: `%${args.title}%` } }
      });

      if (!movie) {
        return { status: "error", message: "Movie not found" };
      }

      return {
        status: "success",
        title: movie.title,
        description: movie.description,
        rating: movie.rating,
        duration: movie.duration,
        director: movie.director,
        cast: movie.castMembers ? movie.castMembers.map(c => c.name).join(', ') : 'Unknown'
      };
    } catch (err) {
      return { status: "error", message: "Database query failed" };
    }
  }

  private static async executeInitiateBooking(args: any) {
    if (!args.movieTitle) return { status: "error", message: "Movie title is required" };
    
    try {
      const movie = await Movie.findOne({
        where: { title: { [Op.like]: `%${args.movieTitle}%` }, isActive: true }
      });

      if (!movie) {
        return { success: false, message: "Sorry, I couldn't find that movie currently playing." };
      }

      return { 
        success: true, 
        message: "Booking intent initiated.",
        movie: {
          id: movie.id,
          title: movie.title,
          posterUrl: movie.posterUrl
        }
      };
    } catch (err) {
      return { success: false, message: "Database error" };
    }
  }
}
