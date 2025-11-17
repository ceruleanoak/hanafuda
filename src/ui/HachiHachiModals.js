/**
 * HachiHachiModals - UI components for Hachi-Hachi game modals
 *
 * Handles:
 * - Sage/Shoubu decision modal
 * - Round-end scoring summary modal
 */

export class HachiHachiModals {
  /**
   * Create and show Sage/Shoubu decision modal
   * @param {Object} params - {dekiyakuList, playerScore, roundNumber, onSage, onShoubu, onCancel}
   * @returns {Promise} Resolves when user makes decision
   */
  static showSageDecision(params) {
    return new Promise((resolve) => {
      const { dekiyakuList, playerScore, roundNumber, opponent1Score, opponent2Score } = params;

      // Calculate dekiyaku value
      const dekiyakuValue = dekiyakuList.reduce((sum, d) => sum + d.value, 0);

      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      `;

      // Create modal content
      const modal = document.createElement('div');
      modal.className = 'sage-decision-modal';
      modal.style.cssText = `
        background: linear-gradient(135deg, #2d5016 0%, #1a3009 100%);
        border: 3px solid #d4af37;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        color: white;
        font-family: Arial, sans-serif;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      `;

      // Title
      const title = document.createElement('h2');
      title.textContent = 'Dekiyaku Formed!';
      title.style.cssText = `
        margin: 0 0 20px 0;
        font-size: 28px;
        color: #d4af37;
        text-align: center;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
      `;
      modal.appendChild(title);

      // Dekiyaku list
      const yakuListDiv = document.createElement('div');
      yakuListDiv.style.cssText = `
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
      `;

      dekiyakuList.forEach(yaku => {
        const yakuLine = document.createElement('div');
        yakuLine.style.cssText = `
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 16px;
        `;
        yakuLine.innerHTML = `
          <span>${yaku.name || yaku.japName}</span>
          <span style="color: #90ee90; font-weight: bold;">${yaku.value} kan</span>
        `;
        yakuListDiv.appendChild(yakuLine);
      });

      // Total
      const totalLine = document.createElement('div');
      totalLine.style.cssText = `
        display: flex;
        justify-content: space-between;
        border-top: 2px solid #d4af37;
        padding-top: 10px;
        font-size: 18px;
        font-weight: bold;
        color: #90ee90;
      `;
      totalLine.innerHTML = `
        <span>Total:</span>
        <span>${dekiyakuValue} kan</span>
      `;
      yakuListDiv.appendChild(totalLine);
      modal.appendChild(yakuListDiv);

      // Current score display
      const scoreDiv = document.createElement('div');
      scoreDiv.style.cssText = `
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
        font-size: 14px;
        line-height: 1.8;
      `;
      scoreDiv.innerHTML = `
        <div><strong>Your Current Score:</strong> ${playerScore} kan</div>
        <div><strong>Opponent 1:</strong> ${opponent1Score} kan</div>
        <div><strong>Opponent 2:</strong> ${opponent2Score} kan</div>
      `;
      modal.appendChild(scoreDiv);

      // Decision explanation
      const explainDiv = document.createElement('div');
      explainDiv.style.cssText = `
        background: rgba(212, 175, 55, 0.1);
        border-left: 4px solid #d4af37;
        padding: 12px;
        margin-bottom: 20px;
        font-size: 13px;
        line-height: 1.6;
      `;
      explainDiv.innerHTML = `
        <div><strong>Sage:</strong> Continue playing - try to get more dekiyaku (risky!)</div>
        <div><strong>Shoubu:</strong> End round - collect these points and win!</div>
        <div><strong>Cancel:</strong> Reduce points to par value (88) - safer option</div>
      `;
      modal.appendChild(explainDiv);

      // Button container
      const buttonDiv = document.createElement('div');
      buttonDiv.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
        margin-top: 20px;
      `;

      // Helper function to create buttons
      const createButton = (text, color, onClick) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
          padding: 12px 16px;
          border: 2px solid ${color};
          border-radius: 6px;
          background: ${color}20;
          color: ${color};
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
        `;
        btn.addEventListener('mouseover', () => {
          btn.style.background = color;
          btn.style.color = '#000';
          btn.style.transform = 'scale(1.05)';
        });
        btn.addEventListener('mouseout', () => {
          btn.style.background = `${color}20`;
          btn.style.color = color;
          btn.style.transform = 'scale(1)';
        });
        btn.addEventListener('click', () => {
          overlay.remove();
          onClick();
          resolve();
        });
        return btn;
      };

      buttonDiv.appendChild(createButton('SAGE', '#ff6b6b', params.onSage));     // Red - risky
      buttonDiv.appendChild(createButton('CANCEL', '#ffd93d', params.onCancel));  // Yellow - safe
      buttonDiv.appendChild(createButton('SHOUBU', '#6bcf7f', params.onShoubu));  // Green - end

      modal.appendChild(buttonDiv);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
  }

  /**
   * Show round-end scoring summary
   * @param {Object} params - {roundNumber, dekiyakuValue, cardPointsValue, finalScore, winner, allScores, fieldMultiplier}
   */
  static showRoundSummary(params) {
    return new Promise((resolve) => {
      const { roundNumber, winner, allScores, fieldMultiplier } = params;

      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      `;

      // Create modal content
      const modal = document.createElement('div');
      modal.className = 'round-summary-modal';
      modal.style.cssText = `
        background: linear-gradient(135deg, #1a3009 0%, #2d5016 100%);
        border: 3px solid #d4af37;
        border-radius: 12px;
        padding: 30px;
        max-width: 600px;
        color: white;
        font-family: Arial, sans-serif;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      `;

      // Title
      const title = document.createElement('h2');
      title.textContent = `Round ${roundNumber} - Summary`;
      title.style.cssText = `
        margin: 0 0 20px 0;
        font-size: 28px;
        color: #d4af37;
        text-align: center;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
      `;
      modal.appendChild(title);

      // Field multiplier info
      const multiplierDiv = document.createElement('div');
      multiplierDiv.style.cssText = `
        text-align: center;
        color: #ffd93d;
        font-weight: bold;
        margin-bottom: 15px;
        font-size: 16px;
      `;
      const multiplierText = fieldMultiplier === 1 ? 'Small Field (1×)' :
                            fieldMultiplier === 2 ? 'Large Field (2×)' :
                            'Grand Field (4×)';
      multiplierDiv.textContent = `Field Multiplier: ${multiplierText}`;
      modal.appendChild(multiplierDiv);

      // Scores table
      const scoresDiv = document.createElement('div');
      scoresDiv.style.cssText = `
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
      `;

      // Header
      const headerDiv = document.createElement('div');
      headerDiv.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 15px;
        margin-bottom: 15px;
        border-bottom: 2px solid #d4af37;
        padding-bottom: 10px;
        font-weight: bold;
        color: #d4af37;
      `;
      headerDiv.innerHTML = `
        <div>Player</div>
        <div style="text-align: center;">Round Score</div>
        <div style="text-align: right;">Game Total</div>
      `;
      scoresDiv.appendChild(headerDiv);

      // Score rows
      const playerNames = ['You', 'Opponent 1', 'Opponent 2'];
      playerNames.forEach((name, i) => {
        const rowDiv = document.createElement('div');
        rowDiv.style.cssText = `
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
          padding: 10px 0;
          align-items: center;
          color: ${winner === i ? '#6bcf7f' : 'white'};
          font-weight: ${winner === i ? 'bold' : 'normal'};
        `;

        const roundScore = allScores.roundScores ? allScores.roundScores[i] : 0;
        const gameTotal = allScores.gameScores ? allScores.gameScores[i] : 0;

        rowDiv.innerHTML = `
          <div>${name}${winner === i ? ' ✓' : ''}</div>
          <div style="text-align: center; color: #90ee90;">${roundScore}</div>
          <div style="text-align: right; font-weight: bold;">${gameTotal}</div>
        `;
        scoresDiv.appendChild(rowDiv);
      });

      modal.appendChild(scoresDiv);

      // Continue button
      const buttonDiv = document.createElement('div');
      buttonDiv.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 12px;
      `;

      const continueBtn = document.createElement('button');
      continueBtn.textContent = 'Continue';
      continueBtn.style.cssText = `
        padding: 12px 32px;
        border: 2px solid #6bcf7f;
        border-radius: 6px;
        background: #6bcf7f20;
        color: #6bcf7f;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
      `;
      continueBtn.addEventListener('mouseover', () => {
        continueBtn.style.background = '#6bcf7f';
        continueBtn.style.color = '#000';
        continueBtn.style.transform = 'scale(1.05)';
      });
      continueBtn.addEventListener('mouseout', () => {
        continueBtn.style.background = '#6bcf7f20';
        continueBtn.style.color = '#6bcf7f';
        continueBtn.style.transform = 'scale(1)';
      });
      continueBtn.addEventListener('click', () => {
        overlay.remove();
        resolve();
      });
      buttonDiv.appendChild(continueBtn);
      modal.appendChild(buttonDiv);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
  }

  /**
   * Show game-end summary
   * @param {Object} params - {winner, finalScores, totalRounds, stats}
   */
  static showGameEnd(params) {
    return new Promise((resolve) => {
      const { winner, finalScores, totalRounds } = params;

      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      `;

      // Create modal content
      const modal = document.createElement('div');
      modal.className = 'game-end-modal';
      modal.style.cssText = `
        background: linear-gradient(135deg, #2d5016 0%, #1a3009 100%);
        border: 4px solid #d4af37;
        border-radius: 12px;
        padding: 40px;
        max-width: 500px;
        color: white;
        font-family: Arial, sans-serif;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
        text-align: center;
      `;

      // Title
      const title = document.createElement('h1');
      title.textContent = 'Game Over';
      title.style.cssText = `
        margin: 0 0 20px 0;
        font-size: 48px;
        color: #d4af37;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
      `;
      modal.appendChild(title);

      // Winner announcement
      const winnerDiv = document.createElement('div');
      winnerDiv.style.cssText = `
        font-size: 28px;
        color: #6bcf7f;
        margin-bottom: 20px;
        font-weight: bold;
      `;
      const winnerName = winner === 0 ? 'You' : `Opponent ${winner}`;
      winnerDiv.textContent = `${winnerName} Wins!`;
      modal.appendChild(winnerDiv);

      // Final scores
      const scoresDiv = document.createElement('div');
      scoresDiv.style.cssText = `
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        font-size: 18px;
        line-height: 2;
      `;

      const playerNames = ['You', 'Opponent 1', 'Opponent 2'];
      playerNames.forEach((name, i) => {
        const scoreDiv = document.createElement('div');
        scoreDiv.style.cssText = `
          display: flex;
          justify-content: space-between;
          color: ${winner === i ? '#6bcf7f' : '#ccc'};
          font-weight: ${winner === i ? 'bold' : 'normal'};
        `;
        scoreDiv.innerHTML = `
          <span>${name}${winner === i ? ' ✓' : ''}</span>
          <span>${finalScores[i]}</span>
        `;
        scoresDiv.appendChild(scoreDiv);
      });
      modal.appendChild(scoresDiv);

      // Game stats
      const statsDiv = document.createElement('div');
      statsDiv.style.cssText = `
        color: #90ee90;
        font-size: 14px;
        margin-bottom: 20px;
      `;
      statsDiv.textContent = `Played ${totalRounds} rounds`;
      modal.appendChild(statsDiv);

      // New game button
      const buttonDiv = document.createElement('div');
      const newGameBtn = document.createElement('button');
      newGameBtn.textContent = 'New Game';
      newGameBtn.style.cssText = `
        padding: 12px 32px;
        border: 2px solid #d4af37;
        border-radius: 6px;
        background: #d4af3720;
        color: #d4af37;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
      `;
      newGameBtn.addEventListener('mouseover', () => {
        newGameBtn.style.background = '#d4af37';
        newGameBtn.style.color = '#000';
        newGameBtn.style.transform = 'scale(1.05)';
      });
      newGameBtn.addEventListener('mouseout', () => {
        newGameBtn.style.background = '#d4af3720';
        newGameBtn.style.color = '#d4af37';
        newGameBtn.style.transform = 'scale(1)';
      });
      newGameBtn.addEventListener('click', () => {
        overlay.remove();
        resolve();
      });
      buttonDiv.appendChild(newGameBtn);
      modal.appendChild(buttonDiv);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
  }
}
