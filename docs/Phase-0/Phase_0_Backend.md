1. Backend Architecture

                Browser
                    │
                    │ HTTP / WebSocket
                    ▼
          Next.js Frontend (UI)
                    │
                    │ API Request
                    ▼
          Node.js + Express Server
                    │
      ┌─────────────┴──────────────┐
      │                            │
      ▼                            ▼
 Socket.IO                  Dockerode Library
      │                            │
      │                    Docker Engine API
      │                            │
      ▼                            ▼
 Browser Terminal           Ubuntu Container
      │                            │
      │                    node-pty creates shell
      │                            │
      ▼                            ▼
     Output <──────────────────────┘


Explanation:

-> User opens SandShell. eg: localhost:3000

-> Next.js: 
    Responsible for
        Login
        Dashboard
        Terminal Page
        Sending API requests

-> Express Server: Acts as server
    Responsible for 
        Receive requests
        Authenticate users
        Create Docker container
        Connect Socket.IO
        Handle terminal sessions

-> Dockerode: Node.js library
    Interface between node and focker engine.
    It talks to Docker Engine.
    without Dockerode: Need to type in terminal manually->docker run ubuntu
    with Dockerode: No need to type manually-> Node.js code has docker.createContainer(...) that runs ubuntu 

-> Docker Engine: Runs containers.
    Creates Ubuntu Container

-> Ubuntu Container: Inside container eg: bash runs.
    This is where commands execute.
    eg: ls,pwd,mkdir etc

-> node-pty: Creates a real Linux terminal.

-> Socket.IO: Maintains live communication.
    eg: Whenever user type : pwd
    Browser instantly sends the current container as output.


2. Docker Lifecycle

User clicks "Start Terminal"
           │
           ▼
Express receives request
           │
           ▼
Dockerode createContainer()
           │
           ▼
Ubuntu Image (means Blueprint eg: Ubuntu ISO)
           │
           ▼
Container Created (Docker copies image)
           │
           ▼
Container Started
           │
           ▼
node-pty starts Bash
           │
           ▼
User Executes Commands
           │
           ▼
Socket.IO sends output
           │
           ▼
User leaves page by clicking (End Session)
           │
           ▼
Container Stops
           │
           ▼
Container Removed

3. API Flow

Browser
   │
POST /api/container/start
   │
   ▼
Express Server
   │
Create Docker Container
   │
   ▼
Return Container ID
   │
   ▼
Browser opens Socket.IO
   │
   ▼
Socket Connected
   │
   ▼
User types command
   │
   ▼
Socket.IO Event
   │
   ▼
node-pty
   │
   ▼
Ubuntu Bash
   │
   ▼
Command Output
   │
   ▼
Socket.IO
   │
   ▼
Browser Terminal

4. Backend Folder Structure

backend/

server.js

routes/
    terminal.js

controllers/
    terminalController.js

services/
    dockerService.js
    terminalService.js

socket/
    socket.js

utils/
    constants.js