import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import "./CountdownTimer.css";

function CountdownTimer() {
   const [timeData, setTimeData] = useState({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
   });
   const prevTimeData = useRef({ days: 0, hours: 0, minutes: 0, seconds: 0 });

   const digitRefs = useRef({
      days: [null, null],
      hours: [null, null],
      minutes: [null, null],
      seconds: [null, null],
   });

   useEffect(() => {
      const startDate = new Date("2026-04-05T00:00:00+05:30"); // IST timezone

      const updateTimer = () => {
         // Get current time in IST
         const now = new Date();
         const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
         const istTime = new Date(
            now.getTime() + istOffset - now.getTimezoneOffset() * 60 * 1000
         );

         const difference = startDate - istTime; // Countdown TO the target date

         if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor(
               (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            );
            const minutes = Math.floor(
               (difference % (1000 * 60 * 60)) / (1000 * 60)
            );
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeData({ days, hours, minutes, seconds });
         } else {
            // If date has passed, show zeros
            setTimeData({ days: 0, hours: 0, minutes: 0, seconds: 0 });
         }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
   }, []);

   // Initialize and animate individual digit changes with rolling effect
   useEffect(() => {
      const animateDigit = (stripRef, newDigit, isInitial = false) => {
         if (!stripRef) return;

         const digitValue = parseInt(newDigit);
         // Each digit is 3.5rem tall, move to show the correct digit
         const yPosition = -digitValue * 3.5; // 3.5rem = height of each digit

         // Kill any existing animations
         gsap.killTweensOf(stripRef);

         if (isInitial) {
            // Set initial position without animation
            gsap.set(stripRef, { y: `${yPosition}rem` });
         } else {
            // Animate the strip to the correct position
            gsap.to(stripRef, {
               y: `${yPosition}rem`,
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

         // Check if this is initial render
         const isInitial =
            prevTimeData.current[unit] === 0 && timeData[unit] === 0;

         // Animate first digit (tens place)
         if (newVal[0] !== oldVal[0] || isInitial) {
            animateDigit(digitRefs.current[unit][0], newVal[0], isInitial);
         }

         // Animate second digit (ones place)
         if (newVal[1] !== oldVal[1] || isInitial) {
            animateDigit(digitRefs.current[unit][1], newVal[1], isInitial);
         }
      });

      prevTimeData.current = { ...timeData };
   }, [timeData]);

   const formatNumber = (num) => String(num).padStart(2, "0");

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

   return (
      <div className="countdown-timer">
         <div className="timer-container">
            <div className="timer-units">
               <div className="timer-unit">
                  <div className="timer-number-wrapper">
                     {renderDigits(timeData.days, "days")}
                  </div>
                  <span className="timer-label">days</span>
               </div>

               <span className="timer-separator">:</span>

               <div className="timer-unit">
                  <div className="timer-number-wrapper">
                     {renderDigits(timeData.hours, "hours")}
                  </div>
                  <span className="timer-label">hours</span>
               </div>

               <span className="timer-separator">:</span>

               <div className="timer-unit">
                  <div className="timer-number-wrapper">
                     {renderDigits(timeData.minutes, "minutes")}
                  </div>
                  <span className="timer-label">min</span>
               </div>

               <span className="timer-separator">:</span>

               <div className="timer-unit">
                  <div className="timer-number-wrapper">
                     {renderDigits(timeData.seconds, "seconds")}
                  </div>
                  <span className="timer-label">sec</span>
               </div>
            </div>
            <span className="timezone-label">IST (UTC+5:30)</span>
         </div>
      </div>
   );
}

export default CountdownTimer;
