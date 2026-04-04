import { useEffect, useState } from "react";
import "./Toast.css";

function Toast({ message, type = "success", onClose, duration = 4000 }) {
   const [isExiting, setIsExiting] = useState(false);

   useEffect(() => {
      const timer = setTimeout(() => {
         setIsExiting(true);
         setTimeout(onClose, 300); // Wait for exit animation
      }, duration);

      return () => clearTimeout(timer);
   }, [duration, onClose]);

   const handleClose = () => {
      setIsExiting(true);
      setTimeout(onClose, 300);
   };

   const icons = {
      success: "\u2713",
      error: "!",
      info: "\u2693",
   };

   return (
      <div className={`toast toast-${type} ${isExiting ? "toast-exit" : ""}`}>
         <span className={`toast-icon toast-icon-${type}`}>{icons[type]}</span>
         <p className="toast-message">{message}</p>
         <button className="toast-close" onClick={handleClose}>
            &times;
         </button>
      </div>
   );
}

export function ToastContainer({ toasts, removeToast }) {
   return (
      <div className="toast-container">
         {toasts.map((toast) => (
            <Toast
               key={toast.id}
               message={toast.message}
               type={toast.type}
               duration={toast.duration}
               onClose={() => removeToast(toast.id)}
            />
         ))}
      </div>
   );
}

let toastId = 0;

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
   const [toasts, setToasts] = useState([]);

   const addToast = (message, type = "success", duration = 4000) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type, duration }]);
   };

   const removeToast = (id) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
   };

   return { toasts, addToast, removeToast };
}
