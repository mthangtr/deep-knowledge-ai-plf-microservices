import mongoose, { Schema, Document } from "mongoose";

export interface IChatContext extends Document {
  topic_id: string;
  node_id?: string;
  user_id: string;
  context: {
    messages: Array<{
      role: "user" | "assistant" | "system";
      content: string;
      timestamp: Date;
    }>;
    summary?: string;
    metadata?: Record<string, any>;
  };
  created_at: Date;
  updated_at: Date;
  last_interaction: Date;
}

const ChatContextSchema = new Schema<IChatContext>(
  {
    topic_id: {
      type: String,
      required: true,
      index: true,
    },
    node_id: {
      type: String,
      default: null,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    context: {
      messages: [
        {
          role: {
            type: String,
            enum: ["user", "assistant", "system"],
            required: true,
          },
          content: {
            type: String,
            required: true,
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      summary: {
        type: String,
        default: null,
      },
      metadata: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
    last_interaction: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Compound index for efficient querying
ChatContextSchema.index({ topic_id: 1, node_id: 1, user_id: 1 });

// Methods
ChatContextSchema.methods.addMessage = function (
  role: string,
  content: string
) {
  this.context.messages.push({
    role,
    content,
    timestamp: new Date(),
  });
  this.last_interaction = new Date();
  return this.save();
};

ChatContextSchema.methods.getRecentMessages = function (limit: number = 10) {
  return this.context.messages.slice(-limit);
};

ChatContextSchema.methods.clearOldMessages = function (keepCount: number = 20) {
  if (this.context.messages.length > keepCount) {
    // Keep system message if it's the first one
    const systemMessage =
      this.context.messages[0]?.role === "system"
        ? [this.context.messages[0]]
        : [];
    const recentMessages = this.context.messages.slice(-keepCount);
    this.context.messages = [...systemMessage, ...recentMessages];
  }
  return this.save();
};

export default mongoose.model<IChatContext>("ChatContext", ChatContextSchema);
