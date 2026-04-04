import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useLanguage } from "./LanguageContext";
import FancyButton from "./FancyButton";
import WantedModal from "./WantedModal";
import { ToastContainer, useToast } from "./Toast";
import "./CountdownTimer.css";

function CountdownTimer({ onComplete }) {
   const { t } = useLanguage();
   const [timeData, setTimeData] = useState({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
   });
   const [isComplete, setIsComplete] = useState(false);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const { toasts, addToast, removeToast } = useToast();
   const hasCalledComplete = useRef(false);
   const prevTimeData = useRef({ days: 0, hours: 0, minutes: 0, seconds: 0 });

   const digitRefs = useRef({
      days: [null, null],
      hours: [null, null],
      minutes: [null, null],
      seconds: [null, null],
   });

   useEffect(() => {
      const startDate = new Date("2026-04-05T21:15:00+05:30"); // IST timezone

      const updateTimer = () => {
         const now = new Date();
         const difference = startDate - now; // Both are UTC internally

         if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor(
               (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
            );
            const minutes = Math.floor(
               (difference % (1000 * 60 * 60)) / (1000 * 60),
            );
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeData({ days, hours, minutes, seconds });
         } else {
            setTimeData({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            if (!hasCalledComplete.current) {
               hasCalledComplete.current = true;
               setIsComplete(true);
               if (onComplete) onComplete();
            }
         }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
   }, [onComplete]);

   // Initialize and animate individual digit changes with rolling effect
   useEffect(() => {
      const animateDigit = (stripRef, newDigit, isInitial = false) => {
         if (!stripRef) return;

         const digitValue = parseInt(newDigit);

         // Get the actual digit height from the element
         const digitElements = stripRef.querySelectorAll(".digit");
         const digitHeight =
            digitElements.length > 0 ? digitElements[0].offsetHeight : 64;

         // Calculate position based on actual height
         const yPosition = -digitValue * digitHeight;

         // Kill any existing animations
         gsap.killTweensOf(stripRef);

         if (isInitial) {
            gsap.set(stripRef, { y: yPosition });
         } else {
            gsap.to(stripRef, {
               y: yPosition,
               duration: 0.6,
               ease: "power2.inOut",
            });
         }
      };

      // Animate each digit independently
      const units = ["days", "hours", "minutes", "seconds"];
      units.forEach((unit) => {
         const newVal = String(timeData[unit]).padStart(2, "0");
         const oldVal = String(prevTimeData.current[unit]).padStart(2, "0");

         const isInitial =
            prevTimeData.current[unit] === 0 && timeData[unit] === 0;

         if (newVal[0] !== oldVal[0] || isInitial) {
            animateDigit(digitRefs.current[unit][0], newVal[0], isInitial);
         }

         if (newVal[1] !== oldVal[1] || isInitial) {
            animateDigit(digitRefs.current[unit][1], newVal[1], isInitial);
         }
      });

      prevTimeData.current = { ...timeData };
   }, [timeData]);

   const renderDigits = (value, unit) => {
      return (
         <>
            <div className="digit-wrapper">
               <div
                  ref={(el) => (digitRefs.current[unit][0] = el)}
                  className="digit-strip"
               >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                     <span key={num} className="digit">
                        {num}
                     </span>
                  ))}
               </div>
            </div>
            <div className="digit-wrapper">
               <div
                  ref={(el) => (digitRefs.current[unit][1] = el)}
                  className="digit-strip"
               >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                     <span key={num} className="digit">
                        {num}
                     </span>
                  ))}
               </div>
            </div>
         </>
      );
   };

   if (isComplete) {
      return (
         <>
            <div className="countdown-timer countdown-complete">
               <p className="wanted-pretext">
                  The World Government has eyes everywhere. Time to claim your
                  bounty, pirate.
               </p>
               <FancyButton
                  text="Generate Wanted Poster"
                  drawerTop="Coming Soon..."
                  drawerBottom="...Stay Tuned"
                  onClick={() => setIsModalOpen(true)}
               />
            </div>
            <WantedModal
               isOpen={isModalOpen}
               onClose={() => setIsModalOpen(false)}
               addToast={addToast}
            />
            <ToastContainer toasts={toasts} removeToast={removeToast} />
         </>
      );
   }

   return (
      <div className="countdown-timer">
         <div className="timer-container">
            <div className="timer-units">
               <div className="timer-unit">
                  <div className="timer-number-wrapper">
                     {renderDigits(timeData.days, "days")}
                  </div>
                  <span className="timer-label">{t.countdown.days}</span>
               </div>

               <span className="timer-separator">:</span>

               <div className="timer-unit">
                  <div className="timer-number-wrapper">
                     {renderDigits(timeData.hours, "hours")}
                  </div>
                  <span className="timer-label">{t.countdown.hours}</span>
               </div>

               <span className="timer-separator">:</span>

               <div className="timer-unit">
                  <div className="timer-number-wrapper">
                     {renderDigits(timeData.minutes, "minutes")}
                  </div>
                  <span className="timer-label">{t.countdown.min}</span>
               </div>

               <span className="timer-separator">:</span>

               <div className="timer-unit">
                  <div className="timer-number-wrapper">
                     {renderDigits(timeData.seconds, "seconds")}
                  </div>
                  <span className="timer-label">{t.countdown.sec}</span>
               </div>
            </div>
            <span className="timezone-label">IST (UTC+5:30)</span>
         </div>
      </div>
   );
}

export default CountdownTimer;
