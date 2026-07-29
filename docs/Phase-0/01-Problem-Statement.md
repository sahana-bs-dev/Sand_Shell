Problem Statement

Developers and students often need a Linux environment to practice commands, compile code, and debug programs.

Installing Linux locally or configuring virtual machines is difficult for beginners.

SandShell AI provides every user with a secure Ubuntu container directly inside the browser, along with an AI assistant that explains commands, fixes errors, and generates code.


Objectives

Primary Objectives

*Browser-based Ubuntu terminal
*One Docker container per user
*Secure session isolation
*File upload/download
*Real-time command execution

AI Objectives

*Explain Linux commands
*Generate code
*Explain errors
*Debug programs
*AI chat assistant

Functional Requirements

* User
* Open website
* Click Start Session
* Get Ubuntu terminal
* Execute commands
* Upload files
* Download files
* End session
* AI Assistant
* Answer Linux questions
* Explain commands
* Generate code
* Explain compiler errors
* Suggest fixes
* Admin
* Monitor running containers
* Monitor RAM usage
* Monitor CPU
* Remove idle sessions

Non-Functional Requirements

* Performance

Terminal response under 200 ms
Container creation under 5 seconds

* Reliability

Session recovery
Automatic cleanup

* Security

Docker isolation
No container access between users

* Scalability

Support hundreds of users

* Availability

24×7

Technology Stack

Frontend

Next.js
React
Tailwind CSS
xterm.js

Backend

Node.js
Express.js
Socket.IO

Containerization

Docker
Dockerode
node-pty

AI

Python
FastAPI
Gemini/OpenAI API
LangChain (optional)

Database

MongoDB

Collections

Users
Sessions
AI Chats
Uploaded Files
Logs

Deployment

Docker
Nginx
VPS or Cloud


    ARCHITECTURE


             Browser
                │
                │
         Next.js Frontend
                │
        HTTP / Socket.IO
                │
         Express Backend
                │
       --------------------
       │                  │
 Docker Engine        AI Server
       │                  │
 Ubuntu Container    LLM API
       │                  │
 Linux Commands   AI Responses

    
    FOLDER STRUCTURE

    SandShell-AI/

frontend/

components/

pages/

terminal/

chat/

backend/

routes/

controllers/

services/

socket/

docker/

ai/

FastAPI/

prompts/

database/

mongodb/

docs/