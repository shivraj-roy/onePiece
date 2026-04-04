import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import "./MusicToggle.css";

function MusicToggle({ trackSrc = "/OnePieceOvertaken.mp3" }) {
   const [isPlaying, setIsPlaying] = useState(false);
   const linesRef = useRef([]);
   const audioRef = useRef(null);
   const currentTrackRef = useRef(trackSrc);

   useEffect(() => {
      // Initialize audio
      audioRef.current = new Audio(trackSrc);
      audioRef.current.loop = false;
      audioRef.current.volume = 0; // Start silent

      // Set initial state for all lines
      linesRef.current.forEach((line) => {
         if (!isPlaying) {
            gsap.set(line, { scaleY: 0.15 });
         }
      });

      let hasStartedFadeOut = false;

      // Check if near end and start fade out
      const handleTimeUpdate = () => {
         if (audioRef.current) {
            const timeLeft =
               audioRef.current.duration - audioRef.current.currentTime;

            // Start fade out 3 seconds before end
            if (timeLeft <= 3 && timeLeft > 0 && !hasStartedFadeOut) {
               hasStartedFadeOut = true;
               gsap.to(audioRef.current, {
                  volume: 0,
                  duration: 3,
                  ease: "power2.inOut",
               });
            }
         }
      };

      // Handle audio end
      const handleEnded = () => {
         setIsPlaying(false);
         hasStartedFadeOut = false;
      };

      audioRef.current.addEventListener("timeupdate", handleTimeUpdate);
      audioRef.current.addEventListener("ended", handleEnded);

      return () => {
         if (audioRef.current) {
            audioRef.current.removeEventListener(
               "timeupdate",
               handleTimeUpdate
            );
            audioRef.current.removeEventListener("ended", handleEnded);
            audioRef.current.pause();
            audioRef.current = null;
         }
      };
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   // Switch track when trackSrc changes
   useEffect(() => {
      if (currentTrackRef.current === trackSrc) return;
      currentTrackRef.current = trackSrc;

      if (!audioRef.current) return;

      const wasPlaying = !audioRef.current.paused;

      if (wasPlaying) {
         // Fade out current track, swap source, fade back in
         gsap.killTweensOf(audioRef.current);
         gsap.to(audioRef.current, {
            volume: 0,
            duration: 1.0,
            ease: "power2.inOut",
            onComplete: () => {
               if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.src = trackSrc;
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch(() => {});
                  gsap.to(audioRef.current, {
                     volume: 0.075,
                     duration: 1.5,
                     ease: "power2.inOut",
                  });
               }
            },
         });
      } else {
         audioRef.current.src = trackSrc;
         audioRef.current.currentTime = 0;
      }
   }, [trackSrc]);

   useEffect(() => {
      if (isPlaying) {
         // Play audio with fade in
         if (audioRef.current) {
            // Kill any existing volume animations
            gsap.killTweensOf(audioRef.current);

            // Reset to beginning if at the end
            if (
               audioRef.current.currentTime >=
               audioRef.current.duration - 0.1
            ) {
               audioRef.current.currentTime = 0;
            }

            audioRef.current.play().catch((err) => {
               console.error("Audio play failed:", err);
               setIsPlaying(false);
            });

            // Fade in audio to 0.75%
            gsap.to(audioRef.current, {
               volume: 0.075,
               duration: 1.5,
               ease: "power2.inOut",
            });
         }

         // Animate to wave pattern
         linesRef.current.forEach((line, index) => {
            // Kill any existing animations
            gsap.killTweensOf(line);

            // Expand from line
            gsap.to(line, {
               scaleY: 1,
               duration: 0.3,
               ease: "power2.out",
               delay: index * 0.04,
            });

            // Start continuous wave animation
            gsap.to(line, {
               scaleY: "random(0.4, 1.5)",
               repeat: -1,
               yoyo: true,
               duration: "random(0.4, 0.7)",
               ease: "sine.inOut",
               delay: 0.3 + index * 0.05,
            });
         });
      } else {
         // Fade out audio
         if (audioRef.current && !audioRef.current.paused) {
            // Kill any existing volume animations
            gsap.killTweensOf(audioRef.current);

            gsap.to(audioRef.current, {
               volume: 0,
               duration: 1.0,
               ease: "power2.inOut",
               onComplete: () => {
                  if (audioRef.current) {
                     audioRef.current.pause();
                  }
               },
            });
         }

         // Animate back to single line
         linesRef.current.forEach((line, index) => {
            // Kill wave animations
            gsap.killTweensOf(line);

            // Collapse to flat line
            gsap.to(line, {
               scaleY: 0.15,
               duration: 0.3,
               ease: "power2.out",
               delay: index * 0.02,
            });
         });
      }
   }, [isPlaying]);

   const handleToggle = () => {
      setIsPlaying(!isPlaying);
   };

   return (
      <button
         className="music-toggle"
         onClick={handleToggle}
         aria-label={isPlaying ? "Pause music" : "Play music"}
      >
         <div className="music-bars">
            {[...Array(5)].map((_, i) => (
               <div
                  key={i}
                  className="music-bar"
                  ref={(el) => (linesRef.current[i] = el)}
               />
            ))}
         </div>
      </button>
   );
}

export default MusicToggle;
