"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Hello world");

  async function signUp() {
    await createUserWithEmailAndPassword(auth, email, password);
    setMessage("Signed up successfully");
  }

  async function signIn() {
    await signInWithEmailAndPassword(auth, email, password);
    setMessage("Signed in successfully");
  }

  async function writeTestDoc() {
    if (!auth.currentUser) {
      setMessage("Sign in first");
      return;
    }

    await setDoc(doc(db, "test", auth.currentUser.uid), {
      text: "Firestore test worked",
      uid: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });

    setMessage("Wrote test document");
  }

  async function readTestDoc() {
    if (!auth.currentUser) {
      setMessage("Sign in first");
      return;
    }

    const snapshot = await getDoc(doc(db, "test", auth.currentUser.uid));
    setMessage(snapshot.exists() ? JSON.stringify(snapshot.data()) : "No doc found");
  }

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">Hello world</h1>

      <input
        className="border p-2 block"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="border p-2 block"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="space-x-2">
        <button className="border px-3 py-2" onClick={signUp}>Sign up</button>
        <button className="border px-3 py-2" onClick={signIn}>Sign in</button>
        <button className="border px-3 py-2" onClick={writeTestDoc}>Write test</button>
        <button className="border px-3 py-2" onClick={readTestDoc}>Read test</button>
      </div>

      <p>{message}</p>
    </main>
  );
}