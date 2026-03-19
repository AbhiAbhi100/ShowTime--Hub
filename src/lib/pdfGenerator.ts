import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface TicketData {
  bookingId: string;
  movieTitle: string;
  moviePoster?: string | null;
  theatreName: string;
  theatreLocation?: string;
  showDate: string;
  showTime: string;
  seats: string[];
  totalAmount: number;
  qrData?: string;
}

export async function generateTicketPDF(ticket: TicketData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Background
  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header with gradient effect
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('CINEMAX', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Movie Ticket', pageWidth / 2, 38, { align: 'center' });

  // Ticket card background
  const cardY = 60;
  const cardHeight = 160;
  doc.setFillColor(30, 30, 40);
  doc.roundedRect(margin, cardY, pageWidth - margin * 2, cardHeight, 5, 5, 'F');

  // Add border accent
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1);
  doc.line(margin, cardY + 50, pageWidth - margin, cardY + 50);

  // Booking ID
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOKING ID', margin + 10, cardY + 15);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(ticket.bookingId, margin + 10, cardY + 25);

  // Status badge
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(pageWidth - margin - 40, cardY + 10, 35, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('CONFIRMED', pageWidth - margin - 38, cardY + 18);

  // Movie title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const movieTitleLines = doc.splitTextToSize(ticket.movieTitle, pageWidth - margin * 2 - 80);
  doc.text(movieTitleLines, margin + 10, cardY + 65);

  // Details section
  const detailsY = cardY + 85;
  const col1X = margin + 10;
  const col2X = pageWidth / 2 + 10;

  // Theatre
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('THEATRE', col1X, detailsY);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(ticket.theatreName, col1X, detailsY + 8);
  if (ticket.theatreLocation) {
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(9);
    doc.text(ticket.theatreLocation, col1X, detailsY + 16);
  }

  // Date
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(9);
  doc.text('DATE', col2X, detailsY);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(ticket.showDate, col2X, detailsY + 8);

  // Time
  const timeY = detailsY + 30;
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(9);
  doc.text('TIME', col1X, timeY);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(ticket.showTime, col1X, timeY + 8);

  // Seats
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(9);
  doc.text('SEATS', col2X, timeY);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  const seatsText = ticket.seats.join(', ');
  const seatLines = doc.splitTextToSize(seatsText, 70);
  doc.text(seatLines, col2X, timeY + 8);

  // Total amount
  const amountY = cardY + cardHeight - 25;
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(9);
  doc.text('TOTAL AMOUNT', col1X, amountY);
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`₹${ticket.totalAmount.toFixed(2)}`, col1X, amountY + 10);

  // Generate QR code
  try {
    const qrData = ticket.qrData || JSON.stringify({
      bookingId: ticket.bookingId,
      movie: ticket.movieTitle,
      date: ticket.showDate,
      time: ticket.showTime,
      seats: ticket.seats,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 1,
      color: {
        dark: '#FFFFFF',
        light: '#1E1E28',
      },
    });

    doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - 50, cardY + cardHeight - 55, 40, 40);
    
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(7);
    doc.text('Scan at entry', pageWidth - margin - 30, cardY + cardHeight - 10, { align: 'center' });
  } catch (error) {
    console.error('Error generating QR code:', error);
  }

  // Footer
  const footerY = cardY + cardHeight + 20;
  doc.setFillColor(30, 30, 40);
  doc.roundedRect(margin, footerY, pageWidth - margin * 2, 40, 5, 5, 'F');

  doc.setTextColor(156, 163, 175);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const instructions = [
    '• Please arrive at least 15 minutes before showtime',
    '• Show this ticket (printed or on mobile) at the entrance',
    '• Outside food and beverages are not allowed',
    '• This ticket is non-refundable and non-transferable',
  ];

  instructions.forEach((instruction, index) => {
    doc.text(instruction, margin + 10, footerY + 10 + (index * 7));
  });

  // Decorative elements
  doc.setFillColor(220, 38, 38);
  doc.circle(margin - 5, cardY + cardHeight / 2, 8, 'F');
  doc.circle(pageWidth - margin + 5, cardY + cardHeight / 2, 8, 'F');

  // Dashed line for tear
  doc.setDrawColor(80, 80, 100);
  doc.setLineDashPattern([3, 3], 0);
  doc.line(margin + 5, cardY + cardHeight - 2, pageWidth - margin - 50, cardY + cardHeight - 2);

  // Save the PDF
  doc.save(`CineMax_Ticket_${ticket.bookingId}.pdf`);
}

export function generateShareUrl(bookingId: string): string {
  return `${window.location.origin}/booking/${bookingId}`;
}

export function generateWhatsAppShareUrl(ticket: TicketData): string {
  const message = encodeURIComponent(
    `🎬 Movie Ticket Booked!\n\n` +
    `📽️ ${ticket.movieTitle}\n` +
    `🎭 ${ticket.theatreName}${ticket.theatreLocation ? `, ${ticket.theatreLocation}` : ''}\n` +
    `📅 ${ticket.showDate} at ${ticket.showTime}\n` +
    `💺 Seats: ${ticket.seats.join(', ')}\n` +
    `🎟️ Booking ID: ${ticket.bookingId}\n\n` +
    `Book your tickets at CineMax!`
  );
  return `https://wa.me/?text=${message}`;
}
