// This file handles email sending using Brevo (formerly Sendinblue)

interface EmailParams {
  to: string
  name: string
  rmaId: string
  productDetails: string
}

interface ReadyEmailParams extends EmailParams {
  otp: string
}

// Function to send RMA confirmation email
export async function sendRMAConfirmationEmail({ to, name, rmaId, productDetails }: EmailParams) {
  try {
    // Using Brevo API to send email
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: "no-reply@eyetechsecurities.in", name: "AK Infotech" },
        to: [{ email: to, name }],
        subject: `[RMA] Your Return Request ${rmaId} has been received`,
        htmlContent: `
          <html>
            <body>
              <h1>Return Request Received</h1>
              <p>Dear ${name},</p>
              <p>We have received your return request for ${productDetails}.</p>
              <p>Your RMA ID is: <strong>${rmaId}</strong></p>
              <p>We will process your request and update you soon.</p>
              <p>Thank you for your patience.</p>
              <p>Best regards,<br>Your Company Support Team</p>
            </body>
          </html>
        `,
      }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}

// Function to send RMA service centre email
export async function sendRMAServiceCentreEmail({ to, name, rmaId, productDetails }: EmailParams) {
  try {
    // Using Brevo API to send email
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: "no-reply@eyetechsecurities.in", name: "AK Infotech" },
        to: [{ email: to, name }],
        subject: `[RMA] Your Return ${rmaId} is in Service Centre`,
        htmlContent: `
          <html>
            <body>
              <h1>Your Return is in Service Centre</h1>
              <p>Dear ${name},</p>
              <p>Your return for ${productDetails} has been sent to our service centre for processing.</p>
              <p>Your RMA ID is: <strong>${rmaId}</strong></p>
              <p>We will notify you once your item is ready for dispatch.</p>
              <p>Thank you for your patience.</p>
              <p>Best regards,<br>Your Company Support Team</p>
            </body>
          </html>
        `,
      }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}

// Function to send RMA ready email with OTP
export async function sendRMAReadyEmail({ to, name, rmaId, productDetails, otp }: ReadyEmailParams) {
  try {
    // Using Brevo API to send email
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: "no-reply@eyetechsecurities.in", name: "AK Infotech" },
        to: [{ email: to, name }],
        subject: `[RMA] Your Return ${rmaId} is Ready`,
        htmlContent: `
          <html>
            <body>
              <h1>Your Return is Ready</h1>
              <p>Dear ${name},</p>
              <p>Your return for ${productDetails} is now ready.</p>
              <p>Your RMA ID is: <strong>${rmaId}</strong></p>
              <p>Your OTP for delivery confirmation is: <strong>${otp}</strong></p>
              <p>Please provide this OTP when receiving your item.</p>
              <p>Best regards,<br>Your Company Support Team</p>
            </body>
          </html>
        `,
      }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}

// Function to send RMA delivered email
export async function sendRMADeliveredEmail({ to, name, rmaId, productDetails }: EmailParams) {
  try {
    // Using Brevo API to send email
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: "no-reply@eyetechsecurities.in", name: "AK Infotech" },
        to: [{ email: to, name }],
        subject: `[RMA] Your Return ${rmaId} has been Delivered`,
        htmlContent: `
          <html>
            <body>
              <h1>Return Delivered</h1>
              <p>Dear ${name},</p>
              <p>Your return for ${productDetails} has been successfully delivered.</p>
              <p>Your RMA ID is: <strong>${rmaId}</strong></p>
              <p>Thank you for your business.</p>
              <p>Best regards,<br>Your Company Support Team</p>
            </body>
          </html>
        `,
      }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}
