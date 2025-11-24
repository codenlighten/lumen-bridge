# User Agent Management System

## Overview

The Lumen Bridge platform now supports **user-created agents** alongside the built-in system agents. This allows users to create, manage, and invoke their own custom AI agents with specialized prompts and behaviors.

## Key Features

### 🔐 Access Control
- **User Isolation**: Users can only see and manage their own agents
- **Admin Access**: Admins can view all registered user agents across all users
- **System Protection**: User agents cannot conflict with system agent names

### 💾 Persistence
- All user agents are stored in MongoDB
- Automatic loading on server startup
- Full CRUD operations (Create, Read, Update, Delete)

### 🎯 Custom Behavior
- Define custom system prompts for your agents
- Add metadata for organization and versioning
- Invoke agents via API with custom context

## Architecture

```
AgentRegistry
├── System Agents (Built-in)
│   ├── SearchAgent
│   ├── TerminalAgent
│   ├── CodeGenerator
│   ├── SummaryAgent
│   └── ReasoningAgent
│
└── User Agents (Custom)
    ├── user-alice
    │   ├── TravelAdvisor
    │   └── RecipeChef
    │
    └── user-bob
        └── FitnessCoach
```

## API Endpoints

### 1. Register a New Agent

**POST** `/api/agents/register`

Create a new user agent with custom behavior.

```json
{
  "userId": "user-alice",
  "name": "TravelAdvisor",
  "description": "Helps plan travel itineraries and suggests destinations",
  "prompt": "You are a travel advisor AI. Help users plan amazing trips...",
  "metadata": {
    "category": "travel",
    "version": "1.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent 'TravelAdvisor' registered successfully",
  "agent": {
    "userId": "user-alice",
    "name": "TravelAdvisor",
    "normalizedName": "traveladvisor",
    "description": "Helps plan travel itineraries...",
    "prompt": "You are a travel advisor AI...",
    "createdAt": "2025-11-24T07:39:21.000Z",
    "updatedAt": "2025-11-24T07:39:21.000Z",
    "type": "user-created"
  }
}
```

### 2. Get My Agents

**GET** `/api/agents/my-agents/:userId`

Retrieve all agents for a specific user.

**Example:** `GET /api/agents/my-agents/user-alice`

**Response:**
```json
{
  "success": true,
  "userId": "user-alice",
  "count": 2,
  "agents": [
    {
      "name": "TravelAdvisor",
      "description": "Helps plan travel itineraries...",
      "createdAt": "2025-11-24T07:39:21.000Z"
    },
    {
      "name": "RecipeChef",
      "description": "Creates recipes and cooking instructions",
      "createdAt": "2025-11-24T07:39:22.000Z"
    }
  ]
}
```

### 3. Get Specific Agent

**GET** `/api/agents/my-agents/:userId/:agentName`

Retrieve a specific user agent.

**Example:** `GET /api/agents/my-agents/user-alice/TravelAdvisor`

### 4. Update Agent

**PUT** `/api/agents/update`

Update an existing user agent.

```json
{
  "userId": "user-alice",
  "agentName": "TravelAdvisor",
  "updates": {
    "description": "Advanced travel planning with budget optimization",
    "metadata": {
      "version": "2.0",
      "features": ["budget-optimization", "multi-city"]
    }
  }
}
```

### 5. Invoke User Agent

**POST** `/api/agents/invoke-user-agent`

Run a user agent with custom context.

```json
{
  "userId": "user-alice",
  "agentName": "TravelAdvisor",
  "context": {
    "userPrompt": "Suggest a 3-day itinerary for Tokyo with a budget of $1000"
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "agentName": "TravelAdvisor",
    "userId": "user-alice",
    "response": "Absolutely! Tokyo is an incredible city...",
    "timestamp": "2025-11-24T07:39:25.000Z"
  }
}
```

### 6. Delete Agent

**DELETE** `/api/agents/delete`

Delete a user agent.

```json
{
  "userId": "user-alice",
  "agentName": "TravelAdvisor"
}
```

### 7. Admin: View All Agents

**GET** `/api/admin/agents?adminKey=YOUR_ADMIN_KEY`

Admin-only endpoint to view all registered user agents.

**Response:**
```json
{
  "success": true,
  "stats": {
    "uniqueAgents": 5,
    "totalAliases": 17,
    "userAgents": 2,
    "totalUserAgents": 3
  },
  "count": 3,
  "agents": [...]
}
```

## Usage Examples

### JavaScript (Node.js)

```javascript
// Register a new agent
const response = await fetch('http://localhost:3000/api/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-alice',
    name: 'CodeReviewer',
    description: 'Reviews code for best practices',
    prompt: 'You are a senior code reviewer. Analyze code for bugs, security issues, and best practices...'
  })
});

const data = await response.json();
console.log('Agent registered:', data.agent.name);

// Invoke the agent
const result = await fetch('http://localhost:3000/api/agents/invoke-user-agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-alice',
    agentName: 'CodeReviewer',
    context: {
      userPrompt: 'Review this function: function add(a, b) { return a + b; }'
    }
  })
});

const reviewResult = await result.json();
console.log('Review:', reviewResult.result.response);
```

### cURL

```bash
# Register agent
curl -X POST http://localhost:3000/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-bob",
    "name": "FitnessCoach",
    "description": "Personal fitness advisor",
    "prompt": "You are a certified fitness coach..."
  }'

# Get my agents
curl http://localhost:3000/api/agents/my-agents/user-bob

# Invoke agent
curl -X POST http://localhost:3000/api/agents/invoke-user-agent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-bob",
    "agentName": "FitnessCoach",
    "context": {
      "userPrompt": "Create a 30-day workout plan for beginners"
    }
  }'
```

## Security & Access Control

### User Isolation
- Each user can only access their own agents
- Attempting to access another user's agent returns `null`
- User agents are scoped by `userId`

### System Agent Protection
- User agents cannot use system agent names
- Reserved names: `search`, `terminal`, `code`, `summary`, `reasoning`
- Attempting to register with a system name throws an error

### Admin Access
- Admin endpoint requires `ADMIN_KEY` environment variable
- Without valid admin key, returns `403 Forbidden`
- Set `ADMIN_KEY` in your `.env` file

```bash
# .env
ADMIN_KEY=your-secure-admin-key-here
```

## Database Schema

User agents are stored in the `agents` collection with this structure:

```javascript
{
  agentId: "user-alice-traveladvisor",
  userId: "user-alice",
  name: "TravelAdvisor",
  normalizedName: "traveladvisor",
  description: "Helps plan travel itineraries...",
  prompt: "You are a travel advisor AI...",
  schema: { ... },
  metadata: {
    category: "travel",
    version: "1.0"
  },
  type: "user-created",
  createdAt: ISODate("2025-11-24T07:39:21.000Z"),
  updatedAt: ISODate("2025-11-24T07:39:21.000Z")
}
```

## Error Handling

### Duplicate Agent Name (Same User)
```json
{
  "error": "You already have an agent named 'TravelAdvisor'. Please choose a different name or update the existing agent."
}
```

### System Agent Name Conflict
```json
{
  "error": "Agent name 'terminal' conflicts with a system agent. Please choose a different name."
}
```

### Agent Not Found
```json
{
  "error": "Agent 'TravelAdvisor' not found for user user-alice"
}
```

### Missing Required Fields
```json
{
  "error": "userId and name are required"
}
```

## Testing

Run the comprehensive test suite:

```bash
node test-user-agents.js
```

This tests:
- ✅ Agent registration
- ✅ Agent retrieval
- ✅ Access control
- ✅ Agent updates
- ✅ Agent invocation
- ✅ Admin view all
- ✅ Conflict detection
- ✅ Database persistence

## Best Practices

### 1. Descriptive Names
Choose clear, descriptive names for your agents:
- ✅ `TravelAdvisor`, `CodeReviewer`, `RecipeChef`
- ❌ `Agent1`, `Test`, `MyAgent`

### 2. Detailed Prompts
Write comprehensive system prompts:
```javascript
{
  prompt: `You are a professional travel advisor AI with expertise in:
    - Budget planning and optimization
    - Multi-city itinerary creation
    - Cultural recommendations
    - Travel safety tips
    
    Always provide:
    1. Detailed day-by-day plans
    2. Cost breakdowns
    3. Alternative options
    4. Local tips and recommendations`
}
```

### 3. Use Metadata
Organize agents with metadata:
```javascript
{
  metadata: {
    category: "travel",
    version: "2.0",
    features: ["budget-optimization", "multi-city"],
    lastUpdated: "2025-11-24",
    author: "alice"
  }
}
```

### 4. Version Control
Track agent changes with version numbers:
```javascript
// When updating
{
  updates: {
    description: "Advanced features added",
    metadata: {
      version: "2.1",
      changelog: ["Added budget optimization", "Improved recommendations"]
    }
  }
}
```

## Future Enhancements

- [ ] Agent sharing between users
- [ ] Public agent marketplace
- [ ] Agent templates
- [ ] Usage analytics
- [ ] Rate limiting per user
- [ ] Agent collaboration (multi-agent workflows)
- [ ] Custom function calling for user agents
- [ ] Agent versioning and rollback

## Support

For issues or questions:
- Check the main [README.md](./README.md)
- Review the [API documentation](./public/api-doc.md)
- Run the test suite: `node test-user-agents.js`

---

**Created by:** Gregory Ward (CodenLighten)  
**License:** ISC  
**Last Updated:** November 24, 2025
