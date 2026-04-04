import "./FancyButton.css";

const CornerSVG = () => (
   <svg
      className="fancy-btn-corner"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-1 1 32 32"
   >
      <path d="M32,32C14.355,32,0,17.645,0,0h.985c0,17.102,13.913,31.015,31.015,31.015v.985Z"></path>
   </svg>
);

function FancyButton({ text, drawerTop, drawerBottom, onClick, hideCorners }) {
   return (
      <div className="fancy-btn-container">
         <div className="fancy-btn-drawer transition-top">{drawerTop}</div>
         <div className="fancy-btn-drawer transition-bottom">
            {drawerBottom}
         </div>

         <button className="fancy-btn" onClick={onClick}>
            <span className="fancy-btn-text">{text}</span>
         </button>

         {!hideCorners && (
            <>
               <CornerSVG />
               <CornerSVG />
               <CornerSVG />
               <CornerSVG />
            </>
         )}
      </div>
   );
}

export default FancyButton;
