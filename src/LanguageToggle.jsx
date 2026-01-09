import { useLanguage } from './LanguageContext';
import './LanguageToggle.css';

function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <div className="language-toggle-glass">
      <div className="language-toggle-wrapper">
        <span className="language-label">EN</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={language === 'jp'}
            onChange={toggleLanguage}
          />
          <span className="slider"></span>
        </label>
        <span className="language-label">JP</span>
      </div>
    </div>
  );
}

export default LanguageToggle;
