import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
   if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
   }

   const { email, name } = req.body;

   if (!email) {
      return res.status(400).json({ error: "Email is required" });
   }

   try {
      await resend.emails.send({
         from: "Straw Hat Crew <crew@mail.shivrajroy.in>",
         to: email,
         subject: "You're on the Crew, Pirate! 🏴‍☠️",
         html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0e0e0e;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0e0e0e;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:12px;border:1px solid #333;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:#cc2322;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;">
                ONE PIECE
              </h1>
              <p style="margin:8px 0 0;color:#f5e6c8;font-size:14px;letter-spacing:2px;text-transform:uppercase;">
                Elbaph Arc
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#f5e6c8;font-size:18px;font-weight:600;">
                Ahoy${name ? `, ${name}` : ""}!
              </p>
              <p style="margin:0 0 24px;color:#ccc;font-size:15px;line-height:1.6;">
                The World Government has taken notice. Your name has been added to the list of pirates awaiting their <strong style="color:#d4a017;">Wanted Poster</strong>.
              </p>
              <p style="margin:0 0 24px;color:#ccc;font-size:15px;line-height:1.6;">
                When the Wanted Poster Generator sets sail, you'll be the first to know. Until then, the seas of Elbaph await.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #333;margin:24px 0;">

              <p style="margin:0;color:#888;font-size:13px;line-height:1.5;text-align:center;">
                "When do you think people die? When they are shot through the heart by a pistol? No. When they have an incurable disease? No. It's when they are forgotten."
              </p>
              <p style="margin:8px 0 0;color:#666;font-size:12px;text-align:center;font-style:italic;">
                — Dr. Hiluluk
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#111;text-align:center;">
              <p style="margin:0;color:#666;font-size:12px;">
                onepiece-arc.vercel.app
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
         `,
      });

      return res.status(200).json({ success: true });
   } catch (error) {
      console.error("Resend error:", error);
      return res.status(500).json({ error: "Failed to send email" });
   }
}
