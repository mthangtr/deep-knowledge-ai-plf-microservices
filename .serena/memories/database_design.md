# Database Schema and Design Patterns

## Database Technology
- **Primary Database**: PostgreSQL with pgvector extension
- **Authentication**: Supabase Auth (built-in `auth.users` table)
- **Vector Storage**: pgvector for semantic search capabilities

## Core Tables (MVP Schema)

### 1. `user_profiles`
- Extends Supabase's `auth.users` table
- Stores public user information (full_name, avatar_url)
- 1-to-1 relationship with `auth.users.id`

### 2. `learning_topics`
- Core learning subjects created by users
- Links to user via `user_id` foreign key
- Contains topic metadata and structure

### 3. `learning_nodes`
- Individual knowledge points within topics
- Hierarchical structure with parent/child relationships
- Stores content, type, and position information

### 4. `chat_sessions`
- Manages chat conversations per user per node
- Ensures conversation context persistence
- Links user and learning node

### 5. `chat_messages`
- Individual messages within chat sessions
- Supports both user and AI messages
- Stores message content and metadata

### 6. `learning_notes`
- User-generated notes for learning content
- Associated with specific learning nodes
- Supports rich text content

## Design Patterns
- **Foreign Key Relationships**: Explicit relationships between all entities
- **Soft Deletes**: Preserve data integrity with status flags
- **Audit Trails**: timestamp fields for created_at/updated_at
- **JSON Storage**: Use JSONB for flexible content storage
- **Vector Embeddings**: Store and query semantic embeddings

## Migration Strategy
- Use Supabase migrations for schema changes
- Version control all schema modifications
- Maintain backwards compatibility when possible
- Test migrations on staging environment first