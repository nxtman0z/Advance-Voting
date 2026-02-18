# 🗳️ Blockchain-Based Online Voting System

> A complete, production-ready decentralized voting platform with **Facial Recognition**, **OTP 2FA**, **MetaMask wallet integration**, and **Ethereum smart contracts**.

---

## 🏗️ Technology Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Frontend       | React.js + Vite + Tailwind CSS          |
| Backend        | Node.js + Express.js                    |
| Blockchain     | Ethereum (Solidity + Hardhat)           |
| Face Auth      | face-api.js (browser-based)             |
| OTP            | Nodemailer (email) + Twilio (SMS)       |
| Database       | MongoDB + Mongoose                      |
| Wallet         | MetaMask + ethers.js v6                 |
| Auth           | JWT + bcrypt + cookie sessions          |

---

## 📁 Project Structure

```
blockchain-voting-system/
├── smart-contract/          # Solidity Smart Contract (Hardhat)
│   ├── contracts/Voting.sol
│   ├── scripts/deploy.js
│   ├── test/Voting.test.js
│   └── hardhat.config.js
│
├── backend/                 # Node.js + Express API
│   ├── controllers/         # authController, voteController, adminController, otpController
│   ├── models/              # User.js, Election.js
│   ├── routes/              # authRoutes, voteRoutes, adminRoutes
│   ├── middleware/          # authMiddleware, faceVerifyMiddleware
│   ├── utils/               # otpUtils, blockchainUtils
│   ├── config/db.js
│   └── server.js
│
├── frontend/                # React.js App
│   ├── src/
│   │   ├── components/      # Navbar, FaceCapture, OTPInput, CandidateCard, ResultChart, AdminPanel
│   │   ├── pages/           # Home, Register, Login, Vote, Results, Admin
│   │   ├── context/         # AuthContext, Web3Context
│   │   └── utils/           # faceApi.js, contract.js, VotingABI.json
│   └── public/
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- MetaMask browser extension
- Git

---

### 1. Smart Contract Setup

```bash
cd smart-contract
npm install

# Start local Hardhat node
npx hardhat node

# In a new terminal — deploy contract
npx hardhat run scripts/deploy.js --network localhost

# Copy the deployed contract address → update backend/.env and frontend/.env
```

**Run Tests:**
```bash
npx hardhat test
```

---

### 2. Backend Setup

```bash
cd backend
npm install

# Configure environment
cp .env .env.local     # Edit with your values
```

Edit `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/blockchain_voting
JWT_SECRET=your_super_secret_key_here
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0xYourContractAddress
ADMIN_PRIVATE_KEY=0xYourAdminPrivateKey
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

```bash
# Start backend
npm run dev
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_CONTRACT_ADDRESS=0xYourContractAddress
VITE_RPC_URL=http://127.0.0.1:8545
```

**Download face-api.js models** (required for facial recognition):
```bash
# Create public/models directory and download models from:
# https://github.com/justadudewhohacks/face-api.js/tree/master/weights

mkdir -p frontend/public/models
# Place these files inside:
# - tiny_face_detector_model-*
# - face_landmark_68_model-*
# - face_recognition_model-*
```

```bash
# Start frontend
npm run dev
```

---

## 🔒 Security Architecture

### Multi-Layer Authentication for Voting

```
Voter → [JWT Auth] → [OTP Verification] → [Face Recognition] → [MetaMask Sign] → [Smart Contract] → Vote Recorded
```

1. **JWT Authentication** — Stateless session management
2. **OTP (Email + SMS)** — Two-factor authentication via Nodemailer/Twilio
3. **Facial Recognition** — face-api.js euclidean distance matching (threshold: 0.5)
4. **MetaMask Wallet** — Cryptographic identity on Ethereum
5. **Smart Contract** — On-chain vote recording with duplicate prevention

---

## 📱 Application Flow

### Voter Registration
1. Fill personal info (name, email, phone, national ID)
2. Receive & verify OTP
3. Capture and register face biometric
4. Link MetaMask wallet

### Voting Process
1. Connect MetaMask wallet
2. Request and verify OTP
3. Complete face verification
4. Select candidate
5. Sign and submit transaction
6. Vote recorded immutably on blockchain

### Admin Workflow
1. Create election with candidates
2. Deploy election to Ethereum blockchain
3. Register eligible voters (on-chain)
4. Monitor live results
5. Publish final results

---

## 🔗 API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint          | Description            | Auth |
|--------|-------------------|------------------------|------|
| POST   | /register         | Register voter         | —    |
| POST   | /login            | Login                  | —    |
| POST   | /logout           | Logout                 | ✓    |
| GET    | /me               | Get current user       | ✓    |
| POST   | /verify-account   | Verify OTP             | ✓    |
| POST   | /register-face    | Register face          | ✓    |
| PATCH  | /update-wallet    | Link wallet            | ✓    |

### Vote (`/api/vote`)
| Method | Endpoint              | Description          | Auth |
|--------|-----------------------|----------------------|------|
| GET    | /elections            | Active elections     | ✓    |
| GET    | /elections/:id        | Election details     | ✓    |
| POST   | /cast                 | Cast vote            | ✓    |
| GET    | /my-votes             | Voting history       | ✓    |
| GET    | /results/:electionId  | Election results     | ✓    |
| POST   | /otp/send             | Send OTP             | ✓    |
| POST   | /otp/verify           | Verify OTP           | ✓    |

### Admin (`/api/admin`)
| Method | Endpoint                            | Description             | Auth  |
|--------|-------------------------------------|-------------------------|-------|
| GET    | /dashboard                          | Stats                   | Admin |
| GET    | /users                              | All voters              | Admin |
| GET    | /elections                          | All elections           | Admin |
| POST   | /elections                          | Create election         | Admin |
| POST   | /elections/:id/deploy               | Deploy to blockchain    | Admin |
| POST   | /elections/:id/register-voter       | Register voter          | Admin |
| PATCH  | /elections/:id/status               | Update status           | Admin |
| PATCH  | /users/:id/toggle-status            | Activate/deactivate     | Admin |

---

## 📜 Smart Contract Functions

```solidity
// Admin
createElection(title, description, startTime, endTime) → electionId
addCandidate(electionId, name, party, imageHash) → candidateId
registerVoter(electionId, voterAddress)
batchRegisterVoters(electionId, voterAddresses[])
toggleElectionStatus(electionId)
transferAdmin(newAdmin)

// Voter
castVote(electionId, candidateId)

// View
getAllElections() → Election[]
getCandidates(electionId) → Candidate[]
getElection(electionId) → Election
getResults(electionId) → (Candidate[], totalVotes)
getVoterStatus(electionId, voter) → (isRegistered, hasVoted, candidateId)
isAdmin(address) → bool
```

---

## 🌐 Supported Networks

| Network         | Chain ID | Note             |
|----------------|----------|------------------|
| Hardhat Local  | 31337    | Development      |
| Sepolia         | 11155111 | Testnet          |
| Mumbai (Polygon)| 80001    | Testnet          |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## ⚠️ Important Notes

- **Never commit** your `.env` files or private keys to version control
- The `ADMIN_PRIVATE_KEY` is only used server-side for contract interactions
- Face descriptors in MongoDB are stored as arrays; consider encryption in production
- Always audit smart contracts before deploying to mainnet
