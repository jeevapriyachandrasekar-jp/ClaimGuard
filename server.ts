import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";

const app = express();
const PORT = 3000;
const JWT_SECRET = "super-secret-key-for-demo";

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// In-memory "database" for demo purposes
const users: any[] = [];
const claims: any[] = [];
const documents: any[] = [];

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  const { email, password, role, name } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: "User already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: Date.now().toString(), email, password: hashedPassword, role, name };
  users.push(user);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

// Claims Routes
app.post("/api/claims", authenticateToken, (req: any, res) => {
  const claim = {
    id: Date.now().toString(),
    userId: req.user.id,
    userName: users.find(u => u.id === req.user.id)?.name,
    status: "pending",
    createdAt: new Date().toISOString(),
    ...req.body
  };
  claims.push(claim);
  res.json(claim);
});

app.get("/api/claims", authenticateToken, (req: any, res) => {
  if (req.user.role === 'assessor') {
    res.json(claims);
  } else {
    res.json(claims.filter(c => c.userId === req.user.id));
  }
});

app.patch("/api/claims/:id", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'assessor') return res.sendStatus(403);
  const index = claims.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.sendStatus(404);
  claims[index] = { ...claims[index], ...req.body };
  res.json(claims[index]);
});

// Documents Routes
app.post("/api/documents", authenticateToken, (req: any, res) => {
  const { type, expiryDate, fileUrl } = req.body;
  
  // Find and remove existing document of the same type for this user
  const existingIndex = documents.findIndex(d => d.userId === req.user.id && d.type === type);
  if (existingIndex !== -1) {
    documents.splice(existingIndex, 1);
  }

  const doc = {
    id: Date.now().toString(),
    userId: req.user.id,
    type,
    expiryDate,
    fileUrl
  };
  documents.push(doc);
  res.json(doc);
});

app.get("/api/documents", authenticateToken, (req: any, res) => {
  res.json(documents.filter(d => d.userId === req.user.id));
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
