import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface ApprovalEmailData {
  recipientEmail: string;
  recipientName: string;
  applicationNumber: string;
  eventTitle: string;
  invoiceAmount: number;
  parkName: string;
  baseUrl?: string;
}

export async function sendApprovalEmail(data: ApprovalEmailData): Promise<boolean> {
  try {
    const paymentUrl = 'https://permit-viewer.replit.app/invoices';
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Application Approved - ${data.applicationNumber}</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Utah State Park logo -->
          <div style="padding: 30px 40px 10px 40px;">
            <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=40&fit=crop" alt="Utah State Park" style="height: 30px; width: auto;">
          </div>
          
          <!-- Parkspass TM -->
          <div style="text-align: right; padding: 0 40px 20px 40px;">
            <span style="color: #6b7280; font-size: 12px;">Parkspass TM</span>
          </div>
          
          <!-- Title -->
          <div style="text-align: center; padding: 20px 40px; background-color: #f9fafb;">
            <h1 style="color: #8B4513; font-size: 24px; font-weight: bold; margin: 0;">APPLICATION APPROVED!</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 40px;">
            <p style="color: #374151; margin: 0 0 20px 0; font-size: 16px;">Dear ${data.recipientName},</p>
            
            <p style="color: #374151; margin: 0 0 20px 0; line-height: 1.6;">We're excited to let you know that your application for a special use permit has been approved.</p>
            
            <div style="margin: 20px 0;">
              <p style="color: #374151; margin: 5px 0; font-size: 16px;"><strong>Event:</strong> ${data.eventTitle}</p>
              <p style="color: #374151; margin: 5px 0; font-size: 16px;"><strong>Park:</strong> ${data.parkName}</p>
              <p style="color: #374151; margin: 5px 0; font-size: 16px;"><strong>Invoice Amount:</strong> $${data.invoiceAmount.toFixed(2)}</p>
            </div>
            
            <p style="color: #374151; margin: 20px 0; line-height: 1.6;">You can now proceed to payment. Once completed, your official permit will be issued.</p>
            
            <p style="color: #374151; margin: 20px 0; line-height: 1.6;">Use Your Application ID: <span style="font-weight: bold; color: #8B4513;">${data.applicationNumber}</span> to pay your Invoice.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentUrl}" style="background-color: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">Pay Invoice</a>
            </div>
            
            <p style="color: #374151; margin: 20px 0 0 0; line-height: 1.6;">If you have any questions, just reply to this email or reach out to our team.</p>
          </div>
          
        </div>
      </div>
    </body>
    </html>
    `;

    

    const msg = {
      to: data.recipientEmail,
      from: '7pepperklein@gmail.com',
      subject: `Application Approved - ${data.eventTitle}`,
      html: htmlContent,
    };

    await sgMail.send(msg);
    console.log(`Approval email sent successfully to ${data.recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending approval email:', error);
    return false;
  }
}