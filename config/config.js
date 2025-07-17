// config.js
// =============================================================================
// Chat Application Configuration
// =============================================================================
// This configuration file stores metadata and descriptions related to the Chat Agent component.
// The goal is to keep the main component clean and maintainable.
//
// Key Features:
// - Stores the descriptive header for the chat component.
// - Provides metadata such as the author and version.
// - Can be extended for additional configuration settings in the future.
// =============================================================================

const chatConfig = {
  flowURL:
    "https://api.zerowidth.ai/v1/process/iuAnoOpMVCJZNwIDLBWK/QdWmPdyniPFTvT7TWXyA",
  header: {
    title: "Chat with ELIZA",
    description:
      "Greetings, I am a draft clone of ELIZA running the DOCTOR script. HOW DO YOU DO. PLEASE STATE YOUR PROBLEM.",
  },
  suggestedPromptsTitle: "Try these prompts:",
  suggestedPrompts: [
    "What is your work style?",
    "Tell me about your work experience.",
    "What tools does she use in her workflow?",
  ],
  chatInputPlaceholder: "Ask me.",
  maxChatHeight: 400,
};

export default chatConfig;
