import { useEffect, useRef, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";
import Marquee from "react-fast-marquee";
import "./WantedModal.css";

const POSTER_IMAGES = [
   "/preview/img-1.webp",
   "/preview/img-2.jpeg",
   "/preview/img-3.webp",
   "/preview/img-4.jpeg",
   "/preview/img-5.jpeg",
   "/preview/img-6.jpeg",
   "/preview/img-7.jpeg",
   "/preview/img-8.webp",
   "/preview/img-9.jpeg",
   "/preview/img-10.jpeg",
   "/preview/img-11.jpeg",
   "/preview/img-12.jpeg",
   "/preview/img-13.webp",
   "/preview/img-14.webp",
];

function WantedModal({ isOpen, onClose, addToast }) {
   const [status, setStatus] = useState("idle"); // idle | loading | success | already | error
   const [userName, setUserName] = useState("");
   const overlayRef = useRef(null);

   useEffect(() => {
      if (!isOpen) {
         // Reset state when modal closes
         setTimeout(() => setStatus("idle"), 300);
      }
   }, [isOpen]);

   useEffect(() => {
      const handleEscape = (e) => {
         if (e.key === "Escape" && isOpen) onClose();
      };
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
   }, [isOpen, onClose]);

   const handleOverlayClick = (e) => {
      if (e.target === overlayRef.current) onClose();
   };

   const handleGoogleSignIn = async () => {
      setStatus("loading");

      try {
         const result = await signInWithPopup(auth, googleProvider);
         const user = result.user;
         const email = user.email;
         const name = user.displayName || "";

         setUserName(name.split(" ")[0] || "Pirate");

         // Check if already signed up
         const docRef = doc(db, "waitlist", email);
         const existing = await getDoc(docRef);

         if (existing.exists()) {
            setStatus("already");
            addToast?.("You're already on the crew!", "info");
            return;
         }

         // Save to Firestore
         await setDoc(docRef, {
            email,
            name: user.displayName || "",
            photoURL: user.photoURL || "",
            signedUpAt: serverTimestamp(),
         });

         // Send confirmation email
         try {
            const res = await fetch("/api/send-confirmation", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ email, name }),
            });
            if (!res.ok) {
               const data = await res.json().catch(() => ({}));
               console.warn("Confirmation email failed:", res.status, data);
            }
         } catch (emailErr) {
            console.warn("Confirmation email request failed:", emailErr);
         }

         setStatus("success");
         addToast?.("Welcome aboard, pirate! Check your email.", "success");
      } catch (error) {
         if (error.code === "auth/popup-closed-by-user") {
            setStatus("idle");
         } else {
            console.error("Sign-in error:", error);
            setStatus("error");
            addToast?.("Something went wrong. Please try again.", "error");
         }
      }
   };

   if (!isOpen) return null;

   return (
      <div
         className="wanted-modal-overlay"
         ref={overlayRef}
         onClick={handleOverlayClick}
      >
         <div className="wanted-modal">
            <button className="wanted-modal-close" onClick={onClose}>
               &times;
            </button>

            <div className="wanted-poster-marquee">
               <Marquee
                  autoFill
                  speed={30}
                  pauseOnHover
                  gradient
                  gradientColor="#141414"
                  gradientWidth={40}
               >
                  {POSTER_IMAGES.map((src, i) => (
                     <img
                        key={i}
                        src={src}
                        alt="Wanted poster"
                        className="wanted-poster-img"
                        draggable={false}
                     />
                  ))}
               </Marquee>
            </div>

            {status === "idle" && (
               <>
                  <h2 className="wanted-modal-title">Wanted Poster Generator</h2>
                  <p className="wanted-modal-desc">
                     The generator isn't ready yet, but sign in to get notified the
                     moment it sets sail.
                  </p>
                  <button
                     className="google-signin-btn"
                     onClick={handleGoogleSignIn}
                  >
                     <svg viewBox="0 0 24 24" width="20" height="20">
                        <path
                           d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                           fill="#4285F4"
                        />
                        <path
                           d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                           fill="#34A853"
                        />
                        <path
                           d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                           fill="#FBBC05"
                        />
                        <path
                           d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                           fill="#EA4335"
                        />
                     </svg>
                     Sign in with Google
                  </button>
                  <p className="wanted-modal-note">
                     We only store your email to notify you. Nothing else.
                  </p>
               </>
            )}

            {status === "loading" && (
               <div className="wanted-modal-status">
                  <div className="wanted-modal-spinner"></div>
                  <p>Checking the bounty boards...</p>
               </div>
            )}

            {status === "success" && (
               <div className="wanted-modal-status">
                  <span className="wanted-modal-check">&#10003;</span>
                  <h2 className="wanted-modal-title">
                     Welcome aboard, {userName}!
                  </h2>
                  <p className="wanted-modal-desc">
                     You'll be the first to know when the Wanted Poster Generator
                     is live. Check your email for confirmation.
                  </p>
               </div>
            )}

            {status === "already" && (
               <div className="wanted-modal-status">
                  <span className="wanted-modal-check already">&#9875;</span>
                  <h2 className="wanted-modal-title">
                     You're already on the crew!
                  </h2>
                  <p className="wanted-modal-desc">
                     We've got your email, {userName}. We'll notify you when it's
                     live.
                  </p>
               </div>
            )}

            {status === "error" && (
               <div className="wanted-modal-status">
                  <span className="wanted-modal-check error">!</span>
                  <p className="wanted-modal-desc">
                     Something went wrong. Please try again.
                  </p>
                  <button
                     className="google-signin-btn retry"
                     onClick={() => setStatus("idle")}
                  >
                     Try Again
                  </button>
               </div>
            )}
         </div>
      </div>
   );
}

export default WantedModal;
