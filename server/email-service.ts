import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface ApprovalEmailData {
  recipientEmail: string;
  recipientName: string;
  applicationId: string;
  eventTitle: string;
  invoiceAmount: number;
  parkName: string;
}

export async function sendApprovalEmail(data: ApprovalEmailData): Promise<boolean> {
  try {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Approved</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }
            .email-container {
                background-color: white;
                border-radius: 8px;
                padding: 30px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header-image {
                width: 100%;
                height: 200px;
                object-fit: cover;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .logo {
                max-width: 200px;
                margin: 20px 0;
            }
            .title {
                color: #8B4513;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
                text-align: center;
            }
            .content {
                margin: 20px 0;
                line-height: 1.8;
            }
            .pay-button {
                background-color: #8B4513;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                display: inline-block;
                margin: 20px 0;
                font-weight: bold;
            }
            .pay-button:hover {
                background-color: #A0522D;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .application-id {
                font-weight: bold;
                color: #8B4513;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <img src="https://6db8e5f9-da07-4aac-b316-cd0bff6717d7-00-kkyowfy9sxyf.janeway.replit.dev/src/assets/junior-louis-jean-e83ypUvKoGY-unsplash_1749762736705.jpg" 
                 alt="Utah State Park" class="header-image">
            
            <div style="text-align: center;">
                <img src="https://6db8e5f9-da07-4aac-b316-cd0bff6717d7-00-kkyowfy9sxyf.janeway.replit.dev/src/assets/Parkspass%20Logo_1749762738349.png" alt="Parkspass" class="logo">
            </div>
            
            <h1 class="title">APPLICATION APPROVED!</h1>
            
            <div class="content">
                <p>Dear ${data.recipientName},</p>
                
                <p>We're excited to let you know that your application for a special use permit has been approved.</p>
                
                <p><strong>Event:</strong> ${data.eventTitle}<br>
                <strong>Park:</strong> ${data.parkName}<br>
                <strong>Invoice Amount:</strong> $${data.invoiceAmount.toFixed(2)}</p>
                
                <p>You can now proceed to payment. Once completed, your official permit will be issued.</p>
                
                <p>Use Your Application ID: <span class="application-id">${data.applicationId}</span> to pay your Invoice.</p>
                
                <div style="text-align: center;">
                    <a href="https://permit-viewer.replit.app/invoices" class="pay-button">Pay Invoice</a>
                </div>
                
                <p>If you have any questions, just reply to this email or reach out to our team.</p>
            </div>
            
            <div class="footer">
                <p>2025 Parkspass - Making public lands easier to access.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const textContent = `
APPLICATION APPROVED!

Dear ${data.recipientName},

We're excited to let you know that your application for a special use permit has been approved.

Event: ${data.eventTitle}
Park: ${data.parkName}
Invoice Amount: $${data.invoiceAmount.toFixed(2)}

You can now proceed to payment. Once completed, your official permit will be issued.

Use Your Application ID: ${data.applicationId} to pay your Invoice.

Pay your invoice at: https://permit-viewer.replit.app/invoices

If you have any questions, just reply to this email or reach out to our team.

2025 Parkspass - Making public lands easier to access.
    `;

    const msg = {
      to: data.recipientEmail,
      from: '7pepperklein@gmail.com',
      subject: `Application Approved - ${data.eventTitle}`,
      text: textContent,
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