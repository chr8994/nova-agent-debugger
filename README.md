# Nova Agent Debugger

A Next.js 14 application for testing and debugging nova-agent-core AI agents. This tool provides a visual interface to connect to any nova-agent-core compatible backend, discover agent configurations, and test chat interactions.

## Features

- 🔧 **Dynamic Configuration** - Configure agent connections via UI (no environment variables needed)
- 🔍 **Agent Discovery** - Auto-discover agent metadata from `.well-known/agent-config` endpoint
- 💬 **Full Chat Interface** - Test agent interactions with streaming support
- 🎨 **Dark Mode Support** - Toggle between light and dark themes
- 📦 **Collapsible Config Panel** - Right sidebar with agent configuration (open by default)
- 💾 **Persistent Settings** - Configuration saved to localStorage
- ⚡ **Tool Execution Visualization** - See tool calls and responses
- 📚 **Knowledge Source Display** - View knowledge sources used in responses

## Getting Started

### Prerequisites

1. **Node.js** 18+ installed
2. **nova-agent-core** backend running (or any compatible API)
3. **chat-ui package** built in the adjacent directory

### Installation

```bash
# Install dependencies
npm install
# or
yarn
```

### Running the Debugger

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Usage

### Connecting to an Agent

1. The app opens with the **Configuration Panel** visible on the right side
2. Enter the **Service URL** of your nova-agent-core instance (e.g., `http://localhost:3000`)
3. Click **"Discover Agent"** to fetch the agent's configuration
4. (Optional) Enter an **Auth Token** if your agent requires authentication
5. Once discovered, you'll see the agent's name, version, capabilities, and available tools
6. The chat interface becomes active and you can start testing!

### Agent Discovery

The debugger attempts to discover agent metadata from these endpoints (in order):
1. `{serviceUrl}/.well-known/agent-config`
2. `{serviceUrl}/api/agent-config`
3. `{serviceUrl}` (root)

The endpoint should return JSON with at minimum a `name` or `agent_id` field.

### Expected Agent Config Response

```json
{
  "name": "My Agent",
  "agent_id": "my-agent",
  "version": "1.0.0",
  "description": "A helpful AI assistant",
  "avatar_url": "https://example.com/avatar.png",
  "theme_color": "#4F46E5",
  "capabilities": ["chat", "tools", "knowledge"],
  "tools": [
    {
      "name": "search",
      "description": "Search the web"
    }
  ]
}
```

## Project Structure

```
nova-agent-debugger/
├── app/
│   ├── api/
│   │   └── discover/
│   │       └── route.ts        # Agent discovery endpoint
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main page (SSR wrapper)
│   └── home-client.tsx         # Client-side chat + config panel
├── components/
│   └── config-panel.tsx        # Collapsible configuration sidebar
├── types/
│   └── agent.ts                # TypeScript types for agent config
├── package.json
├── tailwind.config.ts
├── next.config.js
└── tsconfig.json
```

## Configuration

### No Environment Variables Required!

Unlike the previous version, this debugger does not require any `.env.local` configuration. All settings are managed through the UI and persisted in localStorage.

### LocalStorage Keys

- `nova-debugger-service-url` - Last used service URL
- `nova-debugger-auth-token` - Last used auth token
- `nova-debugger-panel-open` - Panel visibility state

## API Endpoints

### POST /api/discover

Discovers agent metadata from a given service URL.

**Request:**
```json
{
  "url": "http://localhost:3000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "My Agent",
    "version": "1.0.0",
    "description": "...",
    "capabilities": ["..."],
    "tools": [...]
  }
}
```

## Customization

### Styling

The app uses Tailwind CSS. Customize by:

1. Modifying `tailwind.config.ts` theme
2. Overriding CSS variables in `globals.css`
3. Editing component classes directly

### Dark Mode

Dark mode is built-in. Toggle it using the moon/sun icon in the header.

## Troubleshooting

### Module not found errors

Make sure the chat-ui package is built:

```bash
cd ../nova-agent-core/packages/chat-ui
yarn build
```

### Discovery fails

1. Ensure the agent service is running
2. Check if the agent exposes `/.well-known/agent-config` or `/api/agent-config`
3. Verify CORS is configured on the agent backend
4. Check browser console for detailed error messages

### Chat not working after discovery

1. Verify the agent's streaming endpoint is available
2. Check the auth token if authentication is required
3. Look for error messages in the error banner

## Building for Production

```bash
npm run build
npm start
# or
yarn build
yarn start
```

## License

MIT
