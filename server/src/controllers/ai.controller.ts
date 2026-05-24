import { Request, Response } from "express";
import { AIService } from "../services/ai.service";

export const aiController = {
  chat: async (req: Request, res: Response) => {
    try {
      const { message, history } = req.body;

      if (!message) {
        return res.status(400).json({ success: false, message: "Message is required" });
      }

      // We expect history to be an array of { role: 'user' | 'ai', content: string }
      // Because the user requested ephemeral history, the frontend is responsible for maintaining it.
      const chatHistory = history || [];

      const result = await AIService.processChat(message, chatHistory);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error("AI Controller Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Something went wrong while processing the AI request"
      });
    }
  }
};
