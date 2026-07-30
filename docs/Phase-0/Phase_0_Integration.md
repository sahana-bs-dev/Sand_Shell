## Integration part

# Frontend Architecture:

                User
                    │
                    ▼
                Login Page
                    │
                    ▼
                Dashboard
                    │
                    ▼
                Terminal Page
                    │
                    ▼   
                Start Terminal Button

# Backend Arcitecture:

            Start Terminal Button
                    │
                    ▼
            Express API
                    │
                    ▼
            Dockerode
                    │
                    ▼
            Docker Engine
                    │
                    ▼
            Ubuntu Container
                    │
                    ▼
            node-pty (Bash)


# Final Architecture

                    USER
                      │
                      ▼
               Browser (Next.js)
                      │
         HTTP + WebSocket (Socket.IO)
                      │
                      ▼
          Node.js + Express Backend
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
     Dockerode               Authentication/API
          │
          ▼
     Docker Engine
          │
          ▼
    Ubuntu Container
          │
          ▼
       node-pty
          │
          ▼
      Bash Terminal
          │
          ▼
   Command Output
          │
          ▼
      Socket.IO
          │
          ▼
        Browser


# Complete Request Flow

User opens website

        ↓

Next.js loads page

        ↓

User clicks Start Terminal

        ↓

Express receives request

        ↓

Dockerode creates Ubuntu container

        ↓

Docker Engine starts container

        ↓

node-pty launches Bash

        ↓

Socket.IO connects browser

        ↓

User types "pwd"

        ↓

Socket.IO sends command

        ↓

node-pty writes command into Bash

        ↓

Ubuntu executes command

        ↓

Output generated

        ↓

Socket.IO returns output

        ↓

Browser displays result

        ↓

User exits

        ↓

Express stops container

        ↓

Docker removes container