# Text Agent Backend

Backend service for Text Agent - AI-powered text conversation service with Supabase integration.

## Features

- AI-powered chat conversations using OpenAI
- User management with Supabase
- Dynamic system prompts from database
- Conversation history management
- RESTful API endpoints

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key
- Supabase project with configured tables

## Database Setup

Make sure you have the following tables in your Supabase database:

### system_prompts table
```sql
CREATE TABLE system_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### users table
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  system_prompt_id UUID REFERENCES system_prompts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Sample data
```sql
INSERT INTO system_prompts (name, description, prompt) VALUES 
(
  'ברירת מחדל',
  'System prompt ברירת מחדל',
  'אתה סוכנת AI חכמה ומועילה. ענה בעברית בצורה ברורה וידידותית.'
),
(
  'סוכנת מכירות',
  'System prompt לסוכנת מכירות',
  'אתה סוכנת מכירות מקצועית. נסה להבין את צרכי הלקוח ולהציע פתרונות מתאימים. היה ידידותי וממוקד תוצאות.'
),
(
  'תמיכה טכנית',
  'System prompt לתמיכה טכנית',
  'אתה סוכן תמיכה טכנית מקצועי. עזור למשתמשים לפתור בעיות טכניות בצורה יעילה וסבלנית.'
);
```

## Installation

1. Clone the repository
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Copy the environment file:
   ```bash
   cp env.example .env
   ```

5. Update the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-3.5-turbo

   # Supabase Configuration
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here

   # Security
   JWT_SECRET=your_jwt_secret_here
   API_RATE_LIMIT=100

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000

   # Logging
   LOG_LEVEL=info
   ```

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

### Chat Endpoints
- `POST /api/chat/send` - Send a message to the AI
- `GET /api/chat/conversations` - Get all conversations
- `GET /api/chat/conversations/:id` - Get a specific conversation
- `POST /api/chat/conversations` - Create a new conversation
- `DELETE /api/chat/conversations/:id` - Delete a conversation

### System Prompts Endpoints
- `GET /api/chat/system-prompts` - Get all system prompts
- `GET /api/chat/system-prompts/:id` - Get a specific system prompt
- `GET /api/chat/system-prompts/default` - Get the default system prompt

### User Endpoints
- `GET /api/chat/users/:email` - Get user with their system prompt
- `POST /api/chat/users` - Create a new user
- `PUT /api/chat/users/:userId/system-prompt` - Update user's system prompt

## Usage Examples

### Send a message with user email
```bash
curl -X POST http://localhost:3001/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "message": "שלום, איך אתה?",
    "userEmail": "user@example.com"
  }'
```

### Get all system prompts
```bash
curl http://localhost:3001/api/chat/system-prompts
```

### Create a new user
```bash
curl -X POST http://localhost:3001/api/chat/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "systemPromptId": "prompt-uuid-here"
  }'
```

## How It Works

1. When a user sends a message with their email, the system:
   - Looks up the user in the database
   - Retrieves their assigned system prompt
   - If no system prompt is assigned, uses the default one
   - Sends the message to OpenAI with the appropriate system prompt

2. System prompts are stored in Supabase and can be:
   - Retrieved by ID
   - Listed all at once
   - Assigned to users
   - Updated dynamically

## Error Handling

The API returns consistent error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Security

- Rate limiting is implemented
- CORS is configured
- Input validation is performed
- Environment variables are validated on startup

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT