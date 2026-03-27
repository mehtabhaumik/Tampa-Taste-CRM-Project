export const getEmailHeader = () => `
  <div style="background-color: #000; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-family: 'Inter', sans-serif; letter-spacing: 2px;">TAMPA TASTE</h1>
    <p style="color: #888; margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Elevated Coastal Dining</p>
  </div>
`;

export const getEmailFooter = () => `
  <div style="background-color: #f8f9fa; padding: 20px; border-top: 1px solid #eee; border-radius: 0 0 8px 8px; text-align: center; font-family: 'Inter', sans-serif;">
    <p style="color: #666; font-size: 14px; margin: 0;">Thank you for choosing Tampa Taste.</p>
    <div style="margin-top: 15px;">
      <a href="${process.env.APP_URL || '#'}" style="color: #000; text-decoration: none; margin: 0 10px; font-size: 12px; font-weight: bold;">WEBSITE</a>
      <a href="${process.env.APP_URL || '#'}?view=reservations" style="color: #000; text-decoration: none; margin: 0 10px; font-size: 12px; font-weight: bold;">MY BOOKINGS</a>
      <a href="${process.env.APP_URL || '#'}?view=menu" style="color: #000; text-decoration: none; margin: 0 10px; font-size: 12px; font-weight: bold;">MENU</a>
    </div>
    <p style="color: #999; font-size: 10px; margin-top: 20px;">801 Water St, Tampa, FL 33602 | (813) 555-0123</p>
  </div>
`;

export const getReservationEmail = (data: any, isUpdate = false) => `
  <div style="max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; font-family: 'Inter', sans-serif; color: #333;">
    ${getEmailHeader()}
    <div style="padding: 30px;">
      <h2 style="margin-top: 0; color: #000;">${isUpdate ? 'Reservation Updated' : 'Reservation Confirmed'}</h2>
      <p>Hello ${data.name},</p>
      <p>Your reservation at Tampa Taste has been ${isUpdate ? 'successfully updated' : 'confirmed'}. We look forward to serving you!</p>
      
      <div style="background-color: #fcfcfc; border: 1px solid #eee; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; font-size: 14px; color: #666; text-transform: uppercase;">Booking Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #888; font-size: 13px;">Date:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${data.date}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #888; font-size: 13px;">Time:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${data.time}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #888; font-size: 13px;">Guests:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${data.guests} People</td>
          </tr>
          ${data.occasion ? `
          <tr>
            <td style="padding: 5px 0; color: #888; font-size: 13px;">Occasion:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${data.occasion}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      <p style="font-size: 14px; line-height: 1.6;">If you need to make any further changes or cancel your reservation, please use the link below or contact us directly.</p>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.APP_URL || '#'}?view=reservations" style="background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">Manage Reservation</a>
      </div>
    </div>
    ${getEmailFooter()}
  </div>
`;

export const getOrderEmail = (data: any) => `
  <div style="max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; font-family: 'Inter', sans-serif; color: #333;">
    ${getEmailHeader()}
    <div style="padding: 30px;">
      <h2 style="margin-top: 0; color: #000;">Order Received</h2>
      <p>Hello ${data.customerName},</p>
      <p>We've received your order and our chefs are getting started! Your order will be ready shortly.</p>
      
      <div style="background-color: #fcfcfc; border: 1px solid #eee; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; font-size: 14px; color: #666; text-transform: uppercase;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${data.items.map((item: any) => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
              <div style="font-weight: bold;">${item.name} x ${item.quantity}</div>
              <div style="font-size: 12px; color: #888;">$${item.price.toFixed(2)} each</div>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">
              $${(item.price * item.quantity).toFixed(2)}
            </td>
          </tr>
          `).join('')}
          <tr>
            <td style="padding: 15px 0 0; font-weight: bold; font-size: 16px;">Total:</td>
            <td style="padding: 15px 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #000;">
              $${data.total.toFixed(2)}
            </td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 14px; line-height: 1.6;">You'll receive another notification when your order is ready for pickup or being served to your table.</p>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.APP_URL || '#'}" style="background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">View Order Status</a>
      </div>
    </div>
    ${getEmailFooter()}
  </div>
`;

export const getWaitlistEmail = (data: any) => `
  <div style="max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; font-family: 'Inter', sans-serif; color: #333;">
    ${getEmailHeader()}
    <div style="padding: 30px;">
      <h2 style="margin-top: 0; color: #000;">You're on the Waitlist</h2>
      <p>Hello ${data.name},</p>
      <p>You've been added to our waitlist. We'll notify you as soon as your table is ready!</p>
      
      <div style="background-color: #fcfcfc; border: 1px solid #eee; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; font-size: 14px; color: #666; text-transform: uppercase;">Waitlist Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #888; font-size: 13px;">Party Size:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${data.guests} People</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #888; font-size: 13px;">Estimated Wait:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${data.estimatedWait || '30-45'} mins</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 14px; line-height: 1.6;">Please stay close to the restaurant. We'll send you a text or email when your table is about to be ready.</p>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.APP_URL || '#'}" style="background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">Check Position</a>
      </div>
    </div>
    ${getEmailFooter()}
  </div>
`;
