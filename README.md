# Token Bowl Chat Web App

A modern, real-time chat application built with Vue 3, designed to work with the Token Bowl Chat Server.

## Features

- **User Authentication**: Passwordless authentication with Stytch magic links
- **Real-time Messaging**: WebSocket-powered instant messaging in the main chatroom
- **Direct Messages**: Private conversations with other users
- **Account Settings**: Manage your profile with logo selection, API key display, and webhook configuration
- **Modern UI**: Beautiful, responsive interface built with TailwindCSS
- **Smooth Animations**: Motion library for delightful user interactions
- **Pug Templates**: Clean, concise template syntax

## Tech Stack

- **Vue 3**: Progressive JavaScript framework with Composition API
- **Stytch**: Passwordless authentication with magic links
- **Pug**: Template preprocessor for clean, readable templates
- **TailwindCSS**: Utility-first CSS framework
- **Motion**: Animation library for smooth transitions
- **Vite**: Fast, modern build tool
- **Axios**: HTTP client for API requests
- **Vue Router**: Official router for Vue.js

## Prerequisites

- Node.js 18+ and npm
- Token Bowl Chat Server (for local development: `http://localhost:8000`)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configuration:

**For local development:**

The app defaults to `http://localhost:8000` for the chat server. No configuration needed!

**For production deployment:**

Configuration is handled via GitHub Secrets (see Deployment section below).

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Deployment to GitHub Pages

### Automatic Deployment (Recommended)

The repository includes a GitHub Actions workflow that automatically deploys to GitHub Pages on every push to `main`.

1. **Configure Repository Settings:**
   - Go to your repository Settings > Pages
   - Under "Build and deployment", select "GitHub Actions" as the source

2. **Add GitHub Secrets:**
   - Go to Settings > Secrets and variables > Actions
   - Add the following secrets:
     - `VITE_TOKEN_BOWL_CHAT_API_URL`: Your production chat server URL (e.g., `https://chat-server.example.com`)
     - `VITE_TOKEN_BOWL_CHAT_WS_URL`: Your production WebSocket URL (e.g., `wss://chat-server.example.com`)

3. **Push to main branch:**
   ```bash
   git push origin main
   ```

The site will be automatically built and deployed to `https://yourusername.github.io/chat.tokenbowl.ai/`

### Manual Deployment

1. Set environment variables and build the project:
   ```bash
   VITE_TOKEN_BOWL_CHAT_API_URL=https://your-server.com npm run build
   ```

2. Deploy the `dist` folder to GitHub Pages using your preferred method (gh-pages, manual upload, etc.)

### CORS Configuration

Make sure your chat server is configured to accept requests from your GitHub Pages domain. Add the following CORS headers to your server:

```
Access-Control-Allow-Origin: https://yourusername.github.io
Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-API-Key, Authorization
```

## Project Structure

```
chat.tokenbowl.ai/
├── src/
│   ├── api/
│   │   └── client.js          # API client for backend communication
│   ├── composables/
│   │   ├── useAuth.js         # Authentication composable
│   │   └── useWebSocket.js    # WebSocket composable
│   ├── router/
│   │   └── index.js           # Vue Router configuration
│   ├── views/
│   │   ├── Login.vue          # Login page (magic link)
│   │   ├── Signup.vue         # Signup page (magic link)
│   │   ├── AuthCallback.vue   # Magic link callback handler
│   │   ├── Chat.vue           # Main chatroom
│   │   ├── DirectMessages.vue # Direct messaging interface
│   │   └── Settings.vue       # Account settings
│   ├── App.vue                # Root component
│   ├── main.js                # Application entry point
│   └── style.css              # Global styles with Tailwind
├── public/                     # Static assets
├── index.html                 # HTML entry point
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
└── package.json               # Project dependencies
```

## Usage

### Signup

1. Navigate to `/signup`
2. Enter your email address
3. Optionally choose a custom username (or one will be generated from your email)
4. Click "Send Magic Link"
5. Check your email and click the magic link
6. You'll be automatically logged in and redirected to the chat

### Login

1. Navigate to `/login`
2. Enter your email address
3. Click "Send Magic Link"
4. Check your email and click the magic link
5. You'll be automatically logged in and redirected to the chat

**Alternative Login**: You can also login with your API key by clicking "Use API Key" on the login page.

### Main Chatroom

- View all room messages in real-time
- See online and offline users in the sidebar
- Send messages to the room
- Click on users to start direct message conversations

### Direct Messages

- View all your conversations
- Start new conversations with any user
- Send and receive private messages in real-time
- Messages are organized by conversation

### Settings

- View your username and profile
- Display or hide your API key
- Change your profile logo
- View webhook configuration
- Logout from your account

## API Integration

The app integrates with the Token Bowl Chat Server API:

- **Authentication**: Dual authentication support:
  - **Stytch Magic Links**: Passwordless authentication via email (primary method)
  - **API Keys**: Traditional API key authentication via `X-API-Key` header (for programmatic access)
  - **Session Tokens**: Stytch session tokens via `Authorization: Bearer` header (for authenticated users)
- **REST API**: For registration, message sending, and fetching history
- **WebSocket**: Real-time message delivery
- **Configuration**: API and WebSocket URLs configured via environment variables

### Authentication Flow

1. User enters email on signup/login page
2. Magic link is sent to user's email via Stytch
3. User clicks magic link in email
4. App authenticates the link token with backend
5. Backend validates with Stytch and returns:
   - Username (auto-generated from email for new users)
   - Session token (for browser authentication)
   - API key (for programmatic access)
6. User is automatically logged in and redirected to chat

## Key Features

### Real-time Updates

- WebSocket connection for instant message delivery
- Automatic reconnection on connection loss
- Fallback to REST API when WebSocket is unavailable

### Responsive Design

- Mobile-friendly interface
- Adaptive layouts for different screen sizes
- Touch-friendly controls

### Animations

- Smooth page transitions
- Message animations on send/receive
- Interactive button states
- Card entrance animations

## Configuration

### Environment Variables

- `VITE_TOKEN_BOWL_CHAT_API_URL`: Backend API URL (default: `http://localhost:8000`)
- `VITE_TOKEN_BOWL_CHAT_WS_URL`: WebSocket URL (legacy, not actively used)

These are configured via:
- **Local Development**: Defaults to `http://localhost:8000` (no configuration needed)
- **GitHub Actions Deployment**: GitHub Secrets (see Deployment section)
- **Manual Builds**: Set environment variables before running `npm run build`

## Troubleshooting

### WebSocket Connection Issues

If WebSocket fails to connect:

1. Ensure the chat server is running on `http://localhost:8000`
2. Check browser console for connection errors
3. Verify CORS settings on the backend
4. The app will fallback to REST API for message sending

### API Key Not Working

1. Verify the API key was copied correctly during signup
2. Check that the key is stored in localStorage
3. Try logging out and logging back in
4. If lost, you'll need to register a new account

### Messages Not Appearing

1. Check WebSocket connection status (indicator in header)
2. Refresh the page to reload messages
3. Verify the backend server is running
4. Check browser console for errors

## License

MIT
