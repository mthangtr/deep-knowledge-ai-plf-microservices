# Database Schema Documentation (MVP)

This document outlines the simplified, core database schema for the Deep Knowledge AI Platform MVP. The design prioritizes clarity, normalization, and focuses on the essential features for the initial launch.

## Design Philosophy

- **MVP-focused:** Only includes tables essential for core functionality (user management, content structure, chat). Features like progress tracking and plan history are deferred.
- **Clear Relationships:** Uses foreign keys to establish explicit, easy-to-understand relationships between tables.
- **Supabase Integration:** Leverages the built-in `auth.users` table by creating a related `user_profiles` table, which is a standard and secure practice.
- **Session-based Chat:** A robust chat system built on two tables (`chat_sessions` and `chat_messages`) to ensure conversation context is maintained persistently and uniquely for each user at each learning node.

---

## Core Tables

### 1. `user_profiles`

Stores public-facing user information and acts as an extension to Supabase's private `auth.users` table.

| Column       | Type                       | Description                                            |
| ------------ | -------------------------- | ------------------------------------------------------ |
| `id`         | `uuid` (Primary Key)       | Foreign key to `auth.users.id`. Creates a 1-to-1 link. |
| `full_name`  | `text`                     | The user's full name.                                  |
| `avatar_url` | `text`                     | URL for the user's profile picture.                    |
| `updated_at` | `timestamp with time zone` | Automatically updates when the record is modified.     |

### 2. `plans`

Defines the available subscription plans. This table is included in the MVP for future-proofing but is not actively used by any tracking logic yet.

| Column     | Type                   | Description                                              |
| ---------- | ---------------------- | -------------------------------------------------------- |
| `id`       | `serial` (Primary Key) | Unique identifier for the plan.                          |
| `name`     | `text` (Unique)        | The name of the plan (e.g., "Free", "Pro").              |
| `price`    | `numeric(10, 2)`       | The price of the plan.                                   |
| `features` | `jsonb`                | A JSON object or array listing the features of the plan. |

### 3. `user_plan_history`

Tracks the subscription history for each user. This provides a log of which plans a user has been on and for what duration.

| Column       | Type                       | Description                                                |
| ------------ | -------------------------- | ---------------------------------------------------------- |
| `id`         | `bigserial` (Primary Key)  | Unique identifier for the history record.                  |
| `user_id`    | `uuid` (Foreign Key)       | The user associated with this subscription record.         |
| `plan_id`    | `integer` (Foreign Key)    | The plan the user subscribed to.                           |
| `start_date` | `timestamp with time zone` | When the subscription period started.                      |
| `end_date`   | `timestamp with time zone` | When the subscription period ends (or ended). Can be NULL. |

### 4. `learning_topics`

Represents the main, high-level topics or courses in the platform.

| Column        | Type                       | Description                                                    |
| ------------- | -------------------------- | -------------------------------------------------------------- |
| `id`          | `uuid` (Primary Key)       | Unique identifier for the topic.                               |
| `user_id`     | `uuid` (Foreign Key)       | References `user_profiles.id`. The owner/creator of the topic. |
| `title`       | `text`                     | The title of the learning topic.                               |
| `description` | `text`                     | A brief description of what the topic covers.                  |
| `created_at`  | `timestamp with time zone` | Timestamp of when the topic was created.                       |

### 5. `tree_nodes`

Represents individual, specific lessons or concepts within a `learning_topic`.

| Column        | Type                       | Description                                                      |
| ------------- | -------------------------- | ---------------------------------------------------------------- |
| `id`          | `uuid` (Primary Key)       | Unique identifier for the node.                                  |
| `topic_id`    | `uuid` (Foreign Key)       | References `learning_topics.id`. The topic this node belongs to. |
| `parent_id`   | `uuid` (Foreign Key)       | Self-references `tree_nodes.id` to create a hierarchy/tree.      |
| `title`       | `text`                     | The title of the node/lesson.                                    |
| `description` | `text`                     | A brief description of the node's content.                       |
| `created_at`  | `timestamp with time zone` | Timestamp of when the node was created.                          |

### 6. `chat_sessions`

Manages and defines a single, long-running conversation for a user at a specific topic or node. This is the "dossier" for a conversation.

| Column          | Type                       | Description                                                                                                    |
| --------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `id`            | `uuid` (Primary Key)       | The unique session ID used throughout the application.                                                         |
| `user_id`       | `uuid` (Foreign Key)       | The user participating in the session.                                                                         |
| `topic_id`      | `uuid` (Foreign Key)       | The topic context for the session.                                                                             |
| `node_id`       | `uuid` (Foreign Key)       | The specific node context (can be NULL for topic-level chat).                                                  |
| `created_at`    | `timestamp with time zone` | Timestamp of when the session was first created.                                                               |
| `last_activity` | `timestamp with time zone` | Timestamp of the last message, used for sorting sessions.                                                      |
| **Constraint**  | `UNIQUE`                   | A `UNIQUE` constraint on (`user_id`, `topic_id`, `node_id`) ensures only one session exists per user per node. |

### 7. `chat_messages`

Stores every single message, from both the user and the AI assistant.

| Column       | Type                       | Description                                                         |
| ------------ | -------------------------- | ------------------------------------------------------------------- |
| `id`         | `uuid` (Primary Key)       | Unique identifier for the message itself.                           |
| `session_id` | `uuid` (Foreign Key)       | References `chat_sessions.id`. Links the message to a conversation. |
| `role`       | `text`                     | Who sent the message. Must be either 'user' or 'assistant'.         |
| `content`    | `text`                     | The actual content of the message.                                  |
| `created_at` | `timestamp with time zone` | Timestamp of when the message was sent.                             |

### 8. `learning_notes`

Allows users to save personal notes related to a specific learning node.

| Column       | Type                       | Description                             |
| ------------ | -------------------------- | --------------------------------------- |
| `id`         | `uuid` (Primary Key)       | Unique identifier for the note.         |
| `user_id`    | `uuid` (Foreign Key)       | The user who wrote the note.            |
| `node_id`    | `uuid` (Foreign Key)       | The node this note is associated with.  |
| `content`    | `text`                     | The content of the note.                |
| `created_at` | `timestamp with time zone` | Timestamp of when the note was created. |
| `updated_at` | `timestamp with time zone` | Timestamp of the last update.           |
