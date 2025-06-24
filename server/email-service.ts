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
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <title>Application Approved - ${data.applicationNumber}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: Arial, Helvetica, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: white; border-radius: 8px;">
              
              <!-- Header -->
              <tr>
                <td style="padding: 30px 40px 10px 40px;">
                  <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=40&fit=crop" alt="Utah State Park" style="height: 30px; width: auto; display: block;">
                </td>
              </tr>
              
              <!-- Parkspass TM -->
              <tr>
                <td style="padding: 0 40px 20px 40px; text-align: right;">
                  <span style="color: #6b7280; font-size: 12px; font-family: Arial, Helvetica, sans-serif;">Parkspass TM</span>
                </td>
              </tr>
              
              <!-- Title -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center;">
                  <h1 style="color: #8B4513; font-size: 24px; font-weight: bold; margin: 0; font-family: Arial, Helvetica, sans-serif;">APPLICATION APPROVED!</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px 40px;">
                  <p style="color: #374151; margin: 0 0 20px 0; font-size: 16px; font-family: Arial, Helvetica, sans-serif;">Dear ${data.recipientName},</p>
                  
                  <p style="color: #374151; margin: 0 0 20px 0; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">We're excited to let you know that your application for a special use permit has been approved.</p>
                  
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                    <tr>
                      <td style="padding: 5px 0; font-family: Arial, Helvetica, sans-serif; color: #374151; font-size: 16px;"><strong>Event:</strong> ${data.eventTitle}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; font-family: Arial, Helvetica, sans-serif; color: #374151; font-size: 16px;"><strong>Park:</strong> ${data.parkName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; font-family: Arial, Helvetica, sans-serif; color: #374151; font-size: 16px;"><strong>Invoice Amount:</strong> $${data.invoiceAmount.toFixed(2)}</td>
                    </tr>
                  </table>
                  
                  <p style="color: #374151; margin: 20px 0; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">You can now proceed to payment. Once completed, your official permit will be issued.</p>
                  
                  <p style="color: #374151; margin: 20px 0; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">Use Your Application ID: <span style="font-weight: bold; color: #8B4513;">${data.applicationNumber}</span> to pay your Invoice.</p>
                  
                  <!-- Button -->
                  <table border="0" cellspacing="0" cellpadding="0" style="margin: 30px auto;">
                    <tr>
                      <td align="center" style="background-color: #8B4513; border-radius: 4px;">
                        <a href="${paymentUrl}" target="_blank" style="background-color: #8B4513; border: solid 1px #8B4513; border-radius: 4px; color: #ffffff !important; display: inline-block; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; line-height: 44px; text-align: center; text-decoration: none !important; width: 180px; -webkit-text-size-adjust: none; mso-hide: all;">Pay Invoice</a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #374151; margin: 20px 0 0 0; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">If you have any questions, just reply to this email or reach out to our team.</p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
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