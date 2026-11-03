# Assudani's WP Automation Frontend

This is the web-based user interface for Assudani's WP Automation, built with Next.js and React. It provides a sleek, modern dashboard for managing contacts, sending campaigns, and replying to users.

## Features

- **Analytics Dashboard:** Overview of campaign performance, delivery rates, and read receipts.
- **Campaign Manager:** Create campaigns, select approved Meta templates, and send mass messages.
- **Contact Management:** Upload contacts via Excel/CSV, manage contact lists, edit contacts, and view "Not on WA" statuses.
- **Live Chat Interface:** Real-time chat interface for handling 1-on-1 conversations over the WhatsApp API.
- **Responsive Design:** Optimized for desktop, tablet, and mobile web viewing down to 320px screens.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **API Configuration:**
   Ensure that the backend API URL is configured via environment variables (`NEXT_PUBLIC_API_URL`) or in `app/lib/api.js`.
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:5001
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

4. **Build for production:**
   ```bash
   npm run build
   npm run start
   ```
