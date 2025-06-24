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
    
    const htmlContent = `<html>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 0;">

<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding: 30px 30px 10px 30px;">
<img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=40&fit=crop" alt="Utah State Park" style="height: 25px;">
</td>
</tr>

<tr>
<td style="padding: 0 30px 20px 30px; text-align: right;">
<span style="color: #666; font-size: 12px;">Parkspass TM</span>
</td>
</tr>

<tr>
<td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;">
<h1 style="color: #8B4513; font-size: 22px; margin: 0;">APPLICATION APPROVED!</h1>
</td>
</tr>

<tr>
<td style="padding: 30px;">
<p style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Dear ${data.recipientName},</p>
<p style="color: #333; margin: 0 0 15px 0;">We're excited to let you know that your application for a special use permit has been approved.</p>

<p style="color: #333; margin: 15px 0; font-size: 16px;"><strong>Event:</strong> ${data.eventTitle}</p>
<p style="color: #333; margin: 15px 0; font-size: 16px;"><strong>Park:</strong> ${data.parkName}</p>
<p style="color: #333; margin: 15px 0; font-size: 16px;"><strong>Invoice Amount:</strong> $${data.invoiceAmount.toFixed(2)}</p>

<p style="color: #333; margin: 15px 0;">You can now proceed to payment. Once completed, your official permit will be issued.</p>
<p style="color: #333; margin: 15px 0;">Use Your Application ID: <strong style="color: #8B4513;">${data.applicationNumber}</strong> to pay your Invoice.</p>

<div style="text-align: center; margin: 25px 0;">
<table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
<tr>
<td style="background-color: #8B4513; padding: 12px 24px; border-radius: 4px;">
<a href="${paymentUrl}" style="color: white; text-decoration: none; font-weight: bold; font-size: 16px;">Pay Invoice</a>
</td>
</tr>
</table>
</div>

<p style="color: #333; margin: 15px 0 0 0;">If you have any questions, just reply to this email or reach out to our team.</p>
</td>
</tr>
</table>

</div>
</body>
</html>`;

    

    // Debug: Log the HTML content being sent
    console.log('Email HTML content length:', htmlContent.length);
    console.log('First 200 characters of HTML:', htmlContent.substring(0, 200));
    
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