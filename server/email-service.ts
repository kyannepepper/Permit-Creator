import sgMail from '@sendgrid/mail';

// Use the provided API key directly for now
const apiKey = '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';

console.log('SendGrid API key configured successfully');

sgMail.setApiKey(apiKey);

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
      <body style="margin: 0; padding: 32px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); padding: 32px;">
            
            <!-- Header Section -->
            <div style="text-align: left; margin-bottom: 32px;">
              <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=40&fit=crop" alt="Utah State Park" style="height: 30px; width: auto; margin-bottom: 16px;">
              <div style="text-align: right; margin-top: -46px;">
                <span style="color: #6b7280; font-size: 12px;">Parkspass TM</span>
              </div>
            </div>

            <!-- Title Section -->
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: bold; color: #8B4513; margin: 0 0 8px 0;">APPLICATION APPROVED!</h1>
            </div>

            <!-- Application Number Highlight -->
            <div style="background-color: rgba(139, 69, 19, 0.1); border: 1px solid rgba(139, 69, 19, 0.2); border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
              <p style="font-size: 14px; color: #64748b; margin: 0 0 8px 0;">Your Application Number</p>
              <p style="font-size: 24px; font-weight: bold; color: #8B4513; letter-spacing: 0.05em; margin: 0;">${data.applicationNumber}</p>
              <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Keep this number for your records and future reference</p>
            </div>

            <!-- Main Content -->
            <div style="margin-bottom: 24px;">
              <p style="color: #1f2937; margin: 0 0 16px 0; font-size: 16px; line-height: 1.5;">Dear ${data.recipientName},</p>
              <p style="color: #1f2937; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                We're excited to let you know that your application for a special use permit has been approved.
              </p>
            </div>

            <!-- Application Details -->
            <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
              <h3 style="font-weight: 600; margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">Application Details</h3>
              <div style="margin-bottom: 12px;">
                <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                  <div>
                    <p style="font-size: 14px; font-weight: 500; margin: 0; color: #1f2937;">Event</p>
                    <p style="margin: 0; color: #1f2937; font-size: 16px;">${data.eventTitle}</p>
                  </div>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                  <div>
                    <p style="font-size: 14px; font-weight: 500; margin: 0; color: #1f2937;">Park</p>
                    <p style="margin: 0; color: #1f2937; font-size: 16px;">${data.parkName}</p>
                  </div>
                </div>
                <div style="display: flex; align-items: flex-start;">
                  <div>
                    <p style="font-size: 14px; font-weight: 500; margin: 0; color: #1f2937;">Invoice Amount</p>
                    <p style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600;">$${data.invoiceAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Instructions -->
            <div style="margin-bottom: 32px;">
              <p style="color: #1f2937; margin: 0 0 16px 0; font-size: 16px; line-height: 1.5;">
                You can now proceed to payment. Once completed, your official permit will be issued.
              </p>
              <p style="color: #1f2937; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                Use Your Application ID: <strong style="color: #8B4513;">${data.applicationNumber}</strong> to pay your Invoice.
              </p>
            </div>

            <!-- Payment Button -->
            <div style="text-align: center; margin: 32px 0;">
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #8B4513; border-radius: 6px; padding: 0;">
                    <a href="${paymentUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #8B4513; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Pay Invoice</a>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Footer -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5;">
                If you have any questions, just reply to this email or reach out to our team at (801) 538-7220.
              </p>
            </div>

          </div>
        </div>
      </body>
      </html>
    `;

    

    // Debug: Log the HTML content being sent
    console.log('Email HTML content length:', htmlContent.length);
    console.log('First 200 characters of HTML:', htmlContent.substring(0, 200));
    
    const msg = {
      to: data.recipientEmail,
      from: {
        email: '7pepperklein@gmail.com',
        name: 'Utah State Parks - Permit Office'
      },
      subject: `Application Approved - ${data.eventTitle}`,
      html: htmlContent,
    };

    const response = await sgMail.send(msg);
    console.log(`Approval email sent successfully to ${data.recipientEmail}`);
    console.log('SendGrid response status:', response[0].statusCode);
    console.log('SendGrid response headers:', response[0].headers);
    return true;
  } catch (error: any) {
    console.error('Error sending approval email:', error);
    console.error('SendGrid error details:', error.response?.body || error.message);
    return false;
  }
}