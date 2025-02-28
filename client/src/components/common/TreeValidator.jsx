import React, { useState, useEffect } from 'react';
import {
  validateTreeStructure,
  cleanTreeText,
} from '../../utils/treeValidation';
import './TreeValidator.css';

const TreeValidator = ({ treeText, onValidationResult }) => {
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    if (treeText && treeText.trim()) {
      // Clean tree text to handle markdown and comments
      const cleanedText = cleanTreeText(treeText);

      if (cleanedText) {
        const result = validateTreeStructure(treeText);
        setValidationResult(result);

        if (onValidationResult) {
          onValidationResult(result);
        }
      } else {
        setValidationResult(null);
      }
    } else {
      setValidationResult(null);
    }
  }, [treeText, onValidationResult]);

  if (!validationResult || validationResult.isValid) {
    return null;
  }

  return (
    <div className="tree-validator">
      <h3>Validation Errors</h3>
      <ul className="error-list">
        {validationResult.errors.map((error, index) => (
          <li key={index} className="error-item">
            {error}
          </li>
        ))}
      </ul>
      <p className="validator-help">
        Please fix these issues before generating the project structure.
      </p>
    </div>
  );
};

export default TreeValidator;
