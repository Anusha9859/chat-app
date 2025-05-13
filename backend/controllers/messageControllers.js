import asyncHandler from "express-async-handler";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import Chat from "../models/chatModel.js";

// @description     Get all Messages
// @route           GET /api/message/:chatId
// @access          Protected
const allMessages = asyncHandler(async (req, res) => {
  try {
    console.log("Getting messages for chatId:", req.params.chatId);

    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat");

    if (!messages.length) {
      console.log("No messages found for this chat");
    }

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error.message);
    res.status(400);
    throw new Error("Failed to get messages");
  }
});

// @description     Create New Message
// @route           POST /api/message/
// @access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  let newMessage = {
    sender: req.user._id,
    content,
    chat: chatId,
  };

  try {
    let message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    console.error("Error sending message:", error.message);
    res.status(400);
    throw new Error("Failed to send message");
  }
});

export { allMessages, sendMessage };
