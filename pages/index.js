// =============================================================================
// Chat Agent with User & Agent Bubbles (React + Vercel)
//
// This React component renders a chat interface where users can type messages
// and receive responses from an agent via a serverless API endpoint on Vercel.
// Messages are displayed in styled chat bubbles to clearly differentiate between
// user messages (right-aligned) and agent messages (left-aligned).
//
// Key Features:
// - Maintains a conversation history.
// - Displays each message in a styled bubble.
// - Sends user messages to the API and appends the agent's response (rendered as Markdown) to the chat.
// - Automatically scrolls to the latest message in a scrollable parent container.
// - Animates the submit button while the agent is "thinking".
// - Provides detailed comments for ease of understanding.
//
// Author: Thomas J McLeish
// Date: March 2, 2025
// =============================================================================

// Import the chat configuration settings.
// includes the header title, description, and suggested prompts.
import chatConfig from "../config/config";
// Import React hooks for managing state and side effects.
import { useState, useEffect, useRef } from "react";
// Import react-markdown to render markdown content.
import ReactMarkdown from "react-markdown";
// Import UUID to generate session ID
import { v4 as uuidv4 } from "uuid";

/**
 * Retrieves or generates a session ID and stores it in sessionStorage.
 * Ensures it only runs on the client side and limits it to 32 characters.
 * @returns {string} The session ID.
 */
const getSessionId = () => {
  if (typeof window === "undefined") return ""; // Prevent SSR issues

  let sessionId = sessionStorage.getItem("sessionId");
  //if the id is greater than 32 characters, we need to generate a new one.
  sessionId = sessionId && sessionId.length <= 32 ? sessionId : null;

  if (!sessionId) {
    //the generated id is 36 characters long, so we need to remove the dashes and limit it to 32 characters.
    sessionId = uuidv4().replace(/-/g, "").slice(0, 32); // Ensure max 32 chars
    sessionStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
};

/**
 * Retrieves or generates a persistent user ID and stores it in localStorage.
 * Ensures it only runs on the client side and limits it to 32 characters.
 * @returns {string} The user ID.
 */
const getUserId = () => {
  if (typeof window === "undefined") return ""; // Prevent SSR issues

  let userId = localStorage.getItem("userId");
  //if the id is greater than 32 characters, we need to generate a new one.
  userId = userId && userId.length <= 32 ? userId : null;

  if (!userId) {
    //the generated id is 36 characters long, so we need to remove the dashes and limit it to 32 characters.
    userId = uuidv4().replace(/-/g, "").slice(0, 32); // Ensure max 32 chars
    localStorage.setItem("userId", userId);
  }
  return userId;
};

/**
 * AgentComponent renders a chat interface with user and agent bubbles.
 * It manages the conversation state, handles user input and API requests,
 * and renders responses as Markdown.
 *
 * @returns {JSX.Element} The rendered chat interface.
 */
export default function AgentComponent() {
  // State to store the user's current input from the text field.
  const [message, setMessage] = useState("");

  // State to store the conversation as an array of message objects.
  // Each message object has a role ("user" or "agent") and the message content.
  const [conversation, setConversation] = useState([]);

  // State to capture any errors during the API request.
  const [error, setError] = useState(null);

  // State to track if the agent is processing (loading state).
  const [isLoading, setIsLoading] = useState(false);

  // Create a ref to track the end of the messages container.
  const messagesEndRef = useRef(null);

  // Initialize session ID and user ID states.
  const [sessionId, setSessionId] = useState("");
  const [userId, setUserId] = useState("");

  // Initialize the hovered index state for suggested prompts.
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // State to track if the submit button is hovered.
  const [isSubmitHovered, setIsSubmitHovered] = useState(false);

  // State to track if a prompt has been selected
  const [promptSelected, setPromptSelected] = useState(false);

  // Initialize session ID and user ID on the client side
  useEffect(() => {
    setSessionId(getSessionId());
    setUserId(getUserId());
  }, []);

  /**
   * Scrolls the chat container to the bottom to ensure the latest message is visible.
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to the latest message whenever the conversation updates.
  useEffect(() => {
    if (document.querySelector(".chat-container")) {
      scrollToBottom();
    }
  }, [conversation]);

  /**
   * Handles the form submission event.
   * @param {Event} e - The form submission event.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    submitMessage(message);
  };

  /**
   * Handles the submission of the chat input form.
   *
   * Prevents the default form submission behavior, updates the conversation
   * with the user's message, sends the message to the API, and appends the agent's
   * response to the conversation.
   *
   * @param {Event} e - The form submission event.
   * @returns {Promise<void>} A promise that resolves when the submission is complete.
   */
  const submitMessage = async (userInput) => {
    // If the message is empty, do nothing.
    if (!userInput.trim()) return;

    // Clear the input immediately after user submits
    setMessage("");

    // Clear any previous errors.
    setError(null);

    // Create a new conversation entry for the user's message.
    const userMessage = {
      role: "user",
      content: userInput.trim(),
    };

    // Update the conversation state by adding the user's message.
    setConversation((prev) => [...prev, userMessage]);

    // Prepare the payload for the API call.
    // Note: In production, user_id and session_id should be uniquely generated.
    const payload = {
      data: {
        message: userMessage,
      },
      stateful: true,
      stream: false,
      user_id: userId,
      session_id: sessionId,
      verbose: false,
    };

    try {
      // Set loading state to true to trigger the animation.
      setIsLoading(true);

      // Send a POST request to the serverless API endpoint on Vercel.
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // If the server response is not OK, throw an error.
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      // Parse the JSON response from the API.
      const data = await res.json();

      // Extract the agent's reply from output_data.content.
      // If output_data or content is missing, fall back to a default message.
      const agentReply =
        data.output_data && data.output_data.content
          ? data.output_data.content
          : "No valid response received from agent.";

      // Create a new conversation entry for the agent's response.
      const agentMessage = {
        role: "agent",
        content: agentReply,
      };

      // Update the conversation state by adding the agent's message.
      setConversation((prev) => [...prev, agentMessage]);

      // Clear the user input field.
      setMessage("");
    } catch (err) {
      // Log the error to the console for debugging.
      console.error("Error fetching agent response:", err);
      // Update the error state so that the user is informed.
      setError(err.message);
    } finally {
      // Reset the loading state regardless of success or error.
      setIsLoading(false);
    }
  };

  /**
   * Inline styles for chat bubbles based on the message role.
   *
   * @type {Object}
   * @property {Object} user - Styles for user messages (right-aligned, light green background).
   * @property {Object} agent - Styles for agent messages (left-aligned, light gray background).
   */
  const bubbleStyles = {
    user: {
      display: "inline-flex",
      padding: "10px 16px",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "flex-start",
      gap: "4px",
      alignSelf: "flex-end",
      borderRadius: "16px 16px 0 16px",
      border: "1.5px solid #2642DE",
      backgroundColor: "#fff",
      color: "#2642DE",
      fontFamily: "Geist, 'Geist Sans', 'Geist Mono', Arial, sans-serif",
      fontSize: "14px",
      fontStyle: "normal",
      fontWeight: 400,
      lineHeight: 1.2,
      margin: 0,
      maxWidth: "80%",
      wordBreak: "break-word",
    },
    agent: {
      display: "inline-flex",
      padding: "10px 16px",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "flex-start",
      gap: "4px",
      alignSelf: "flex-start",
      borderRadius: "16px 16px 16px 0",
      background: "#F4F4F4",
      color: "#161616",
      fontFamily: "Geist, 'Geist Sans', 'Geist Mono', Arial, sans-serif",
      fontSize: "14px",
      fontStyle: "normal",
      fontWeight: 400,
      lineHeight: 1.2,
      margin: 0,
      maxWidth: "80%",
      wordBreak: "break-word",
    },
  };

  /**
   * Handles the click event on a suggested prompt.
   *
   * Sets the chat input to the prompt text when clicked.
   * Submit the prompt to the chat
   *
   * @param {Object} prompt - The prompt object containing text and autoSubmit flag.
   */
  const handlePromptClick = async (prompt) => {
    setPromptSelected(true); // Hide prompts after selection
    // Set the chat input to the prompt text.
    setMessage(prompt);
    // Submit the prompt to the chat.
    setTimeout(() => {
      submitMessage(prompt);
    }, 0); // Ensures the state has been updated before calling submitMessage
  };

  /**
   * Handles the mouseover event on a suggested prompt.
   * @param {*} index
   */
  const handlePromptMouseOver = (index) => {
    if (!isLoading) {
      setHoveredIndex(index);
    }
  };

  /**
   * Handles the mouseout event on a suggested prompt.
   */
  const handlePromptMouseOut = () => {
    setHoveredIndex(null);
  };

  return (
    <div
      style={{
        padding: "5px",
        width: "100vw",
        maxWidth: "350px",
        margin: "0 auto",
        fontFamily: "Geist, 'Geist Sans', 'Geist Mono', Arial, sans-serif",
        borderRadius: "5px",
        height: "494px", // Fixed height for the UI
        position: "relative",
      }}
    >
      {/* Descriptive header for the chat application */}

      {/* Chat conversation container displaying messages in bubbles */}
      {(conversation.length > 0 || promptSelected) && (
        <div
          className="chat-container"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0px",
            marginBottom: "0px",
            height: chatConfig.maxChatHeight, // Set a fixed height for the chat container
            overflowY: "auto", // Enable vertical scrolling
            padding: "0px",
            borderRadius: "5px 5px 0 0",
            backgroundColor: "#fff",
            width: "100%",
          }}
        >
        {conversation.map((msg, index) => {
          const isUser = msg.role === "user";
          const isPrevUser = index > 0 && conversation[index - 1].role === "user";
          const isPrevAgent = index > 0 && conversation[index - 1].role === "agent";
          let marginTop = 0;
          if (index > 0) {
            if ((isUser && isPrevAgent) || (!isUser && isPrevUser)) {
              marginTop = 18;
            }
          }
          return (
            <div
              key={index}
              style={{
                ...(isUser ? bubbleStyles.user : bubbleStyles.agent),
                marginTop: marginTop,
              }}
            >
              {msg.role === "agent" ? (
                // Render the agent's response as Markdown.
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                // Display user messages as plain text.
                msg.content
              )}
            </div>
          );
        })}
        {/* Dummy element to ensure the latest message is scrolled into view */}
        <div ref={messagesEndRef} />
        </div>
      )}

      {/* Suggested Prompts Section */}
      {!promptSelected && (
        <div
          style={{
            position: "absolute",
            top: "182px",
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            alignSelf: "stretch",
            marginBottom: "0px",
          }}
        >
          <div style={{
            margin: "2px",
            alignSelf: "stretch",
            color: "#161616",
            fontFamily: "Geist, 'Geist Sans', 'Geist Mono', Arial, sans-serif",
            fontSize: "12px",
            fontStyle: "normal",
            fontWeight: 500,
            lineHeight: "normal",
            textTransform: "uppercase"
          }}>
            {chatConfig.suggestedPromptsTitle}
          </div>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "8px",
            alignSelf: "stretch"
          }}>
            {chatConfig.suggestedPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handlePromptClick(prompt)}
                onMouseOver={() => handlePromptMouseOver(index)}
                onMouseOut={handlePromptMouseOut}
                disabled={isLoading}
                style={{
                  display: "flex",
                  padding: "10px 14px",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "16px",
                  border: "1px solid #2642DE",
                  margin: "0",
                  backgroundColor: "transparent",
                  color: "#2642DE",
                  fontFamily: "Geist, 'Geist Sans', 'Geist Mono', Arial, sans-serif",
                  fontSize: "14px",
                  fontStyle: "normal",
                  fontWeight: 400,
                  lineHeight: "12px",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "auto",
                  height: "auto",
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat input form for the user to send messages */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0px", width: "100%", position: "absolute", left: 0, right: 0, bottom: "30px" }}>
        <div
          style={{
            display: "flex",
            padding: "12px 20px",
            justifyContent: "space-between",
            alignItems: "center",
            borderRadius: "24px",
            background: "#F4F4F4",
            width: "100%",
          }}
        >
          <input
            type="text"
            id="message"
            placeholder={chatConfig.chatInputPlaceholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "326px",
              padding: 0,
              border: "none",
              outline: "none",
              backgroundColor: "#F4F4F4",
              color: "#161616",
              fontFamily: "Geist, 'Geist Sans', 'Geist Mono', Arial, sans-serif",
              fontSize: "16px",
              fontStyle: "normal",
              fontWeight: 400,
              lineHeight: "normal",
              height: "auto",
              minHeight: "1.5em",
            }}
          />
          <button
            type="submit"
            aria-label="Send prompt"
            data-testid="send-button"
            disabled={isLoading}
            onMouseOver={() => setIsSubmitHovered(true)}
            onMouseOut={() => setIsSubmitHovered(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9999px",
              transition: "opacity 0.2s ease",
              border: "none",
              cursor: isLoading ? "default" : "pointer",
              background: "transparent",
              boxShadow: "none",
              paddingLeft: "20px",
              paddingTop: 0,
              paddingRight: 0,
              paddingBottom: 0,
              width: "auto",
              height: "auto",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 12 12"
              fill="none"
              style={{ width: "16px", height: "16px", aspectRatio: "1 / 1", display: "block" }}
            >
              <path d="M9.13125 6.75L4.93125 10.95L6 12L12 6L6 0L4.93125 1.05L9.13125 5.25H0V6.75H9.13125Z"
                fill={isLoading ? "#D3D3D3" : isSubmitHovered ? "#2642DE" : "#1C1B1F"} />
            </svg>
          </button>
        </div>
      </form>

      {/* Display error message if one occurs */}
      {error && (
        <div style={{ color: "red", marginTop: "20px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Define keyframes for the spin animation */}
      <style jsx>{`
        .chat-container::-webkit-scrollbar {
          width: 8px; /* Make scrollbar thinner */
        }
        .chat-container::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 5px; /* Ensures the track has rounded corners */
        }
        .chat-container::-webkit-scrollbar-thumb {
          background-color: #ccc;
          border-radius: 5px;
        }
        /* Firefox scrollbar styling */
        .chat-container {
          scrollbar-width: thin;
          scrollbar-color: #ccc transparent;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
