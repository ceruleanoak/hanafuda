/**
 * HachiHachiModals - UI components for Hachi-Hachi game modals
 *
 * Handles:
 * - Sage/Shoubu decision modal
 * - Round-end scoring summary modal
 */

export class HachiHachiModals {
  /**
   * Create and show Sage/Shoubu decision modal with interactive information
   * @param {Object} params - {dekiyakuList, playerScore, roundNumber, onSage, onShoubu, onCancel, allPlayers, deckRemaining, fieldCardCount, parValue, fieldMultiplier}
   * @returns {Promise} Resolves when user makes decision
   */
  static showSageDecision(params) {
    return new Promise((resolve) => {
      const { dekiyakuList, playerScore, roundNumber, opponent1Score, opponent2Score, allPlayers = [], deckRemaining = 0, fieldCardCount = 0, parValue = 88, fieldMultiplier = 1 } = params;

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
        pointer-events: none;
      `;

      // Create modal content
      const modal = document.createElement('div');
      modal.className = 'sage-decision-modal';
      modal.style.cssText = `
        background: linear-gradient(135deg, #2d5016 0%, #1a3009 100%);
        border: 3px solid #d4af37;
        border-radius: 12px;
        padding: 30px;
        max-width: 900px;
        max-height: 85vh;
        color: white;
        font-family: Arial, sans-serif;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        gap: 20px;
        overflow-y: auto;
        pointer-events: auto;
      `;

      // Title
      const title = document.createElement('h2');
      title.textContent = 'Dekiyaku Formed!';
      title.style.cssText = `
        margin: 0;
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

      // ===== HELP SECTION - Large, bold instructions =====
      const helpDiv = document.createElement('div');
      helpDiv.style.cssText = `
        background: rgba(212, 175, 55, 0.15);
        border: 3px solid #ffd93d;
        border-radius: 8px;
        padding: 20px;
        font-size: 16px;
        line-height: 1.8;
      `;

      // Main help text
      const helpTitle = document.createElement('div');
      helpTitle.style.cssText = `
        font-size: 20px;
        font-weight: bold;
        color: #ffd93d;
        margin-bottom: 15px;
        text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
      `;
      helpTitle.textContent = '👇 HOVER OVER ZONES BELOW TO REVIEW:';
      helpDiv.appendChild(helpTitle);

      // Player info with hand counts
      const playerNames = ['You', 'Opponent 1', 'Opponent 2'];
      const playerInfoDiv = document.createElement('div');
      playerInfoDiv.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
        margin-bottom: 15px;
      `;

      if (allPlayers && allPlayers.length >= 3) {
        playerNames.forEach((name, idx) => {
          const hand = allPlayers[idx]?.hand || [];
          const captured = allPlayers[idx]?.captured || [];
          const playerCard = document.createElement('div');
          playerCard.style.cssText = `
            background: ${idx === 0 ? 'rgba(107, 207, 127, 0.2)' : 'rgba(100, 100, 100, 0.2)'};
            border: 2px solid ${idx === 0 ? '#90ee90' : '#aaa'};
            border-radius: 6px;
            padding: 12px;
            text-align: center;
          `;
          playerCard.innerHTML = `
            <div style="font-weight: bold; color: ${idx === 0 ? '#90ee90' : '#fff'}; margin-bottom: 6px;">${name}</div>
            <div style="font-size: 14px;">✋ Hand: <strong>${hand.length}</strong></div>
            <div style="font-size: 14px;">🎯 Captured: <strong>${captured.length}</strong></div>
          `;
          playerInfoDiv.appendChild(playerCard);
        });
      }
      helpDiv.appendChild(playerInfoDiv);

      // Instructions for hover zones
      const instructionsDiv = document.createElement('div');
      instructionsDiv.style.cssText = `
        background: rgba(0, 0, 0, 0.3);
        border-left: 4px solid #ffd93d;
        padding: 12px;
        border-radius: 4px;
        font-size: 14px;
      `;
      instructionsDiv.innerHTML = `
        <div style="margin-bottom: 8px;"><strong>🎴 DRAW PILE</strong> - Hover to see remaining cards in deck</div>
        <div><strong>📚 TRICK PILES</strong> - Hover over each player's corner to see captured cards</div>
      `;
      helpDiv.appendChild(instructionsDiv);

      modal.appendChild(helpDiv);

      // Decision explanation
      const explainDiv = document.createElement('div');
      explainDiv.style.cssText = `
        background: rgba(212, 175, 55, 0.1);
        border-left: 4px solid #d4af37;
        padding: 12px;
        font-size: 13px;
        line-height: 1.6;
      `;
      explainDiv.innerHTML = `
        <div><strong>Sage:</strong> Continue playing - try to get more dekiyaku (risky!)</div>
        <div><strong>Shoubu:</strong> End round - collect these points and win!</div>
      `;
      modal.appendChild(explainDiv);

      // Button container (spans full width at bottom)
      const buttonDiv = document.createElement('div');
      buttonDiv.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        grid-column: 1;
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
      const { roundNumber, winner, allScores, fieldMultiplier, teyaku, dekiyaku, cardBreakdown, scoreBreakdown, opponentDecisions, stats } = params;

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
        overflow-y: auto;
      `;

      // Create modal content
      const modal = document.createElement('div');
      modal.className = 'round-summary-modal';
      modal.style.cssText = `
        background: linear-gradient(135deg, #1a3009 0%, #2d5016 100%);
        border: 3px solid #d4af37;
        border-radius: 12px;
        padding: 25px;
        max-width: 95vw;
        width: 1200px;
        color: white;
        font-family: Arial, sans-serif;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        margin: 20px auto;
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        overflow-y: auto;
      `;

      // Title
      const title = document.createElement('h2');
      title.textContent = `Round ${roundNumber} - Summary`;
      title.style.cssText = `
        margin: 0 0 10px 0;
        font-size: 20px;
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
        margin-bottom: 10px;
        font-size: 13px;
      `;
      const multiplierText = fieldMultiplier === 1 ? 'Small Field (1×)' :
                            fieldMultiplier === 2 ? 'Large Field (2×)' :
                            'Grand Field (4×)';
      multiplierDiv.textContent = `Field Multiplier: ${multiplierText}`;
      modal.appendChild(multiplierDiv);

      // Create a wrapper container for side-by-side layout
      const contentWrapper = document.createElement('div');
      contentWrapper.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-bottom: 15px;
      `;

      // Helper functions for calculating totals
      const getTeyakuTotal = (list) => {
        if (!list || list.length === 0) return 0;
        return list.reduce((sum, t) => sum + (t.value || 0), 0) * fieldMultiplier;
      };

      const getDekiyakuTotal = (list) => {
        if (!list || list.length === 0) return 0;
        return list.reduce((sum, d) => sum + (d.value || 0), 0) * fieldMultiplier;
      };

      // Setup arrays for teyaku and dekiyaku
      const playerNames = ['You', 'Opponent 1', 'Opponent 2'];
      const teyakuArray = teyaku ? [teyaku.player, teyaku.opponent1, teyaku.opponent2] : [[], [], []];
      const dekiyakuArray = dekiyaku ? [dekiyaku.player, dekiyaku.opponent1, dekiyaku.opponent2] : [[], [], []];

      // LEFT COLUMN: Scoring breakdown section
      if (teyaku || dekiyaku) {
        const breakdownDiv = document.createElement('div');
        breakdownDiv.style.cssText = `
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 12px;
          font-size: 11px;
          line-height: 1.4;
          grid-column: 1;
        `;

        playerNames.forEach((name, i) => {
          const playerDiv = document.createElement('div');
          playerDiv.style.cssText = `
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(212, 175, 55, 0.15);
          `;

          let html = `<div style="font-weight: bold; color: #90ee90; font-size: 11px;">${name}:</div>`;

          const teyakuList = teyakuArray[i] || [];
          const dekiyakuList = dekiyakuArray[i] || [];

          // Calculate net teyaku payment for this player (same logic as payment modal)
          const calculateNetTeyakuPayment = (playerIndex) => {
            const playerTeyakuValue = getTeyakuTotal(teyakuArray[playerIndex]);
            let netPayment = 0;

            // Collect from other players if this player has teyaku
            if (playerTeyakuValue > 0) {
              netPayment += playerTeyakuValue * 2; // Collect from both other players
            }

            // Pay to other players who have teyaku
            for (let j = 0; j < 3; j++) {
              if (j !== playerIndex) {
                const otherTeyakuValue = getTeyakuTotal(teyakuArray[j]);
                if (otherTeyakuValue > 0) {
                  netPayment -= otherTeyakuValue;
                }
              }
            }

            return netPayment;
          };

          const netTeyakuPayment = calculateNetTeyakuPayment(i);

          // Teyaku scoring - show NAMES only, not zero-sum payments
          if (teyakuList.length > 0) {
            html += `<div style="color: #ffd93d; font-size: 10px; margin-top: 2px;">Teyaku:</div>`;
            teyakuList.forEach(t => {
              html += `<div style="font-size: 10px; margin-left: 5px; color: #ddd;">• ${t.name}</div>`;
            });
          }

          // Dekiyaku scoring - show NAMES only, not zero-sum payments
          if (dekiyakuList.length > 0) {
            html += `<div style="color: #87ceeb; font-size: 10px; margin-top: 2px;">Dekiyaku:</div>`;
            dekiyakuList.forEach(d => {
              html += `<div style="font-size: 10px; margin-left: 5px; color: #ddd;">• ${d.name}</div>`;
            });
          }

          if (teyakuList.length === 0 && dekiyakuList.length === 0) {
            html += `<div style="color: #999; font-size: 10px; margin-left: 5px;">No yaku</div>`;
          }

          playerDiv.innerHTML = html;
          breakdownDiv.appendChild(playerDiv);
        });

        contentWrapper.appendChild(breakdownDiv);
      }

      // RIGHT COLUMN: Card breakdown section with complete scoring
      if (cardBreakdown && stats) {
        const cardBreakdownDiv = document.createElement('div');
        cardBreakdownDiv.style.cssText = `
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 12px;
          font-size: 11px;
          line-height: 1.4;
          grid-column: 2;
        `;

        playerNames.forEach((name, i) => {
          const cards = cardBreakdown[i];
          if (!cards) return;

          const playerCardDiv = document.createElement('div');
          playerCardDiv.style.cssText = `
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(212, 175, 55, 0.15);
          `;

          const rawPoints = cards.points;
          const parValue = stats.parValue || 88;
          const cardScore = (rawPoints - parValue) * fieldMultiplier;

          // Calculate net teyaku payment for this player (including what others collect from them)
          const teyakuList = teyakuArray[i] || [];
          const calculateNetTeyakuPayment = (playerIndex) => {
            const playerTeyakuValue = getTeyakuTotal(teyakuArray[playerIndex]);
            let netPayment = 0;

            // Collect from other players if this player has teyaku
            if (playerTeyakuValue > 0) {
              netPayment += playerTeyakuValue * 2; // Collect from both other players
            }

            // Pay to other players who have teyaku
            for (let j = 0; j < 3; j++) {
              if (j !== playerIndex) {
                const otherTeyakuValue = getTeyakuTotal(teyakuArray[j]);
                if (otherTeyakuValue > 0) {
                  netPayment -= otherTeyakuValue;
                }
              }
            }

            return netPayment;
          };

          const netTeyakuPayment = calculateNetTeyakuPayment(i);

          // Calculate dekiyaku total for this player
          const dekiyakuList = dekiyakuArray[i] || [];
          const dekiyakuTotal = dekiyakuList.length > 0
            ? dekiyakuList.reduce((sum, d) => sum + (d.value || 0), 0) * fieldMultiplier
            : 0;

          // Calculate final round score (cards + dekiyaku only, teyaku already paid at start)
          const roundTotal = cardScore + dekiyakuTotal;

          let html = `<div style="font-weight: bold; color: #d4af37; font-size: 11px;">${name}:</div>`;
          html += `<div style="margin-left: 5px; color: #aaa; font-size: 10px; margin-top: 2px;">`;
          html += `Brights: ${cards.brights} | Ribbons: ${cards.ribbons} | Animals: ${cards.animals} | Chaff: ${cards.chaffs}`;
          html += `</div>`;

          // Base card points calculation
          html += `<div style="margin-left: 5px; color: #ccc; font-size: 9px; margin-top: 3px;">`;
          html += `${rawPoints}pts → (${rawPoints}-${parValue})×${fieldMultiplier} = ${cardScore} kan`;
          html += `</div>`;

          // Show dekiyaku as zero-sum component (separate line)
          if (dekiyakuTotal !== 0) {
            const dekiyakuColor = dekiyakuTotal > 0 ? '#87ceeb' : '#ff6b6b';
            html += `<div style="margin-left: 5px; color: ${dekiyakuColor}; font-size: 9px; margin-top: 2px;">`;
            html += `Dekiyaku: ${dekiyakuTotal} kan from 2 opponents = ${dekiyakuTotal} kan × 2 = ${dekiyakuTotal * 2} kan`;
            html += `</div>`;
          }

          // Final round total (NOTE: Teyaku already paid at round start)
          html += `<div style="margin-left: 5px; color: #90ee90; font-weight: bold; font-size: 10px; margin-top: 3px;">`;
          html += `Round Total: ${roundTotal} kan`;
          html += `</div>`;

          playerCardDiv.innerHTML = html;
          cardBreakdownDiv.appendChild(playerCardDiv);
        });

        contentWrapper.appendChild(cardBreakdownDiv);
      }

      modal.appendChild(contentWrapper);

      // Scores table
      const scoresDiv = document.createElement('div');
      scoresDiv.style.cssText = `
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
        font-size: 12px;
        overflow-x: auto;
      `;

      // Header
      const headerDiv = document.createElement('div');
      headerDiv.style.cssText = `
        display: grid;
        grid-template-columns: 1.5fr 0.9fr 0.9fr 0.9fr 0.9fr 1fr 1fr;
        gap: 6px;
        margin-bottom: 8px;
        border-bottom: 2px solid #d4af37;
        padding-bottom: 6px;
        font-weight: bold;
        color: #d4af37;
        font-size: 10px;
      `;
      headerDiv.innerHTML = `
        <div>Player</div>
        <div style="text-align: right;">Teyaku</div>
        <div style="text-align: right;">Pot</div>
        <div style="text-align: right;">Dekiyaku</div>
        <div style="text-align: right;">Par</div>
        <div style="text-align: right;">Round Total</div>
        <div style="text-align: right;">Total</div>
      `;
      scoresDiv.appendChild(headerDiv);

      // Score rows
      playerNames.forEach((name, i) => {
        const rowDiv = document.createElement('div');
        rowDiv.style.cssText = `
          display: grid;
          grid-template-columns: 1.5fr 0.9fr 0.9fr 0.9fr 0.9fr 1fr 1fr;
          gap: 6px;
          padding: 6px 0;
          align-items: center;
          color: ${winner === i ? '#6bcf7f' : 'white'};
          font-weight: ${winner === i ? 'bold' : 'normal'};
          font-size: 10px;
        `;

        const breakdown = scoreBreakdown && scoreBreakdown[i] ? scoreBreakdown[i] : { teyakuScore: 0, potScore: 0, dekiyakuScore: 0, parScore: 0, roundTotal: 0 };
        const gameTotal = allScores.gameScores ? allScores.gameScores[i] : 0;

        const teyakuDisplay = breakdown.teyakuScore !== 0 ? (breakdown.teyakuScore > 0 ? '+' : '') + breakdown.teyakuScore : '—';
        const potDisplay = breakdown.potScore !== 0 ? (breakdown.potScore > 0 ? '+' : '') + breakdown.potScore : '—';
        const dekiyakuDisplay = breakdown.dekiyakuScore !== 0 ? (breakdown.dekiyakuScore > 0 ? '+' : '') + breakdown.dekiyakuScore : '—';
        const parDisplay = breakdown.parScore !== 0 ? (breakdown.parScore > 0 ? '+' : '') + breakdown.parScore : '—';
        const roundTotalDisplay = breakdown.roundTotal > 0 ? '+' + breakdown.roundTotal : breakdown.roundTotal;

        rowDiv.innerHTML = `
          <div>${name}${winner === i ? ' ✓' : ''}</div>
          <div style="text-align: right; color: ${breakdown.teyakuScore > 0 ? '#90ee90' : breakdown.teyakuScore < 0 ? '#ff6b6b' : '#999'};">${teyakuDisplay}</div>
          <div style="text-align: right; color: ${breakdown.potScore > 0 ? '#90ee90' : breakdown.potScore < 0 ? '#ff6b6b' : '#999'};">${potDisplay}</div>
          <div style="text-align: right; color: ${breakdown.dekiyakuScore > 0 ? '#87ceeb' : breakdown.dekiyakuScore < 0 ? '#ff6b6b' : '#999'};">${dekiyakuDisplay}</div>
          <div style="text-align: right; color: ${breakdown.parScore > 0 ? '#ffd700' : breakdown.parScore < 0 ? '#ff6b6b' : '#999'};">${parDisplay}</div>
          <div style="text-align: right; color: #90ee90; font-weight: bold;">${roundTotalDisplay}</div>
          <div style="text-align: right;">${gameTotal}</div>
        `;
        scoresDiv.appendChild(rowDiv);
      });

      modal.appendChild(scoresDiv);

      // Opponent decisions footer
      if (opponentDecisions && Object.keys(opponentDecisions).length > 0) {
        const decisionsDiv = document.createElement('div');
        decisionsDiv.style.cssText = `
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #444;
          font-size: 11px;
          color: #aaa;
        `;

        let decisionsHtml = '<div style="font-weight: bold; margin-bottom: 8px; color: #d4af37;">Opponent Decisions:</div>';

        for (const [playerIndex, decision] of Object.entries(opponentDecisions)) {
          const playerName = playerIndex === '1' ? 'Opponent 1' : 'Opponent 2';
          const decisionText = decision.decision === 'shoubu' ? '🛑 Shoubu' :
                              decision.decision === 'sage' ? '⚔️ Sage' :
                              '🔄 Cancel';
          decisionsHtml += `<div style="margin-left: 8px; margin-bottom: 4px;">${playerName}: ${decisionText} (${decision.dekiyakuValue} kan)</div>`;
        }

        decisionsDiv.innerHTML = decisionsHtml;
        modal.appendChild(decisionsDiv);
      }

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
        padding: 8px 24px;
        border: 2px solid #6bcf7f;
        border-radius: 6px;
        background: #6bcf7f20;
        color: #6bcf7f;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 0.5px;
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
      const winnerText = winner === 0 ? 'You Win!' : `Opponent ${winner} Wins!`;
      winnerDiv.textContent = winnerText;
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

  /**
   * Show Teyaku Payment Grid - teaches zero-sum payment mechanic
   * @param {Object} params - {roundNumber, playerTeyaku, opponent1Teyaku, opponent2Teyaku, fieldMultiplier, onContinue}
   */
  static showTeyakuPaymentGrid(params) {
    return new Promise((resolve) => {
      const { roundNumber, playerTeyaku, opponent1Teyaku, opponent2Teyaku, fieldMultiplier, onContinue } = params;

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
      modal.className = 'teyaku-grid-modal';
      modal.style.cssText = `
        background: linear-gradient(135deg, #1a3009 0%, #2d5016 100%);
        border: 3px solid #d4af37;
        border-radius: 12px;
        padding: 30px;
        max-width: 700px;
        color: white;
        font-family: Arial, sans-serif;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      `;

      // Title
      const title = document.createElement('h2');
      title.textContent = `Round ${roundNumber} - Teyaku Payments`;
      title.style.cssText = `
        margin: 0 0 10px 0;
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
        margin-bottom: 20px;
        font-size: 14px;
      `;
      const multiplierText = fieldMultiplier === 1 ? 'Small Field (1×)' :
                            fieldMultiplier === 2 ? 'Large Field (2×)' :
                            'Grand Field (4×)';
      multiplierDiv.textContent = `Field Multiplier: ${multiplierText}`;
      modal.appendChild(multiplierDiv);

      // Calculate teyaku values for each player
      const getTeyakuTotal = (teyakuList) => {
        if (!teyakuList || teyakuList.length === 0) return 0;
        return teyakuList.reduce((sum, t) => sum + (t.value || 0), 0) * fieldMultiplier;
      };

      const playerTotal = getTeyakuTotal(playerTeyaku);
      const opp1Total = getTeyakuTotal(opponent1Teyaku);
      const opp2Total = getTeyakuTotal(opponent2Teyaku);

      // Calculate payments using authentic Hachi-Hachi rules:
      // Each player WITH teyaku collects their teyaku value from EACH OTHER PLAYER
      // Therefore: payment to each player = (value they collect from opponent1) + (value they collect from opponent2)
      //            payment from each player = (opp1 collects from them) + (opp2 collects from them) + (player collects from them)

      // Calculate net payment for each player
      const calculatePayment = (playerKey) => {
        let netPayment = 0;

        // What this player collects (if they have teyaku)
        const myValue = playerKey === 'player' ? playerTotal :
                        playerKey === 'opponent1' ? opp1Total : opp2Total;

        // Collect from each other player
        if (myValue > 0) {
          const otherValues = [
            playerKey !== 'player' ? playerTotal : 0,
            playerKey !== 'opponent1' ? opp1Total : 0,
            playerKey !== 'opponent2' ? opp2Total : 0
          ];
          // We collect myValue from each of the 2 other players
          netPayment += myValue * 2; // Collect from both opponents
        }

        // What others collect from this player
        const othersCollect = [
          playerKey !== 'player' ? playerTotal : 0,
          playerKey !== 'opponent1' ? opp1Total : 0,
          playerKey !== 'opponent2' ? opp2Total : 0
        ];
        netPayment -= othersCollect.reduce((sum, val) => sum + val, 0);

        return netPayment;
      };

      const playerPayment = calculatePayment('player');
      const opp1Payment = calculatePayment('opponent1');
      const opp2Payment = calculatePayment('opponent2');

      // Payment details section
      const detailsDiv = document.createElement('div');
      detailsDiv.style.cssText = `
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
      `;

      // You section
      const youSection = document.createElement('div');
      youSection.style.cssText = `
        margin-bottom: 15px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(212, 175, 55, 0.3);
      `;
      let youHTML = `<div style="font-weight: bold; color: #90ee90; margin-bottom: 8px;">You:</div>`;
      if (playerTeyaku && playerTeyaku.length > 0) {
        youHTML += playerTeyaku.map(t => {
          let cardList = '';
          if (t.cardsInvolved && t.cardsInvolved.length > 0) {
            cardList = ` [${t.cardsInvolved.map(c => c.name).join(', ')}]`;
          }
          return `<div style="font-size: 13px; color: #ccc;">  • ${t.name}: ${t.value} kan × ${fieldMultiplier} = ${t.value * fieldMultiplier} kan${cardList}</div>`;
        }).join('');
      } else {
        youHTML += '<div style="font-size: 13px; color: #999;">  No teyaku</div>';
      }
      youHTML += `<div style="font-weight: bold; color: ${playerPayment >= 0 ? '#90ee90' : '#ff6b6b'}; margin-top: 8px;">Total: ${playerPayment >= 0 ? '+' : ''}${playerPayment} kan</div>`;
      youSection.innerHTML = youHTML;
      detailsDiv.appendChild(youSection);

      // Opponent 1 section
      const opp1Section = document.createElement('div');
      opp1Section.style.cssText = `
        margin-bottom: 15px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(212, 175, 55, 0.3);
      `;
      let opp1HTML = `<div style="font-weight: bold; color: #90ee90; margin-bottom: 8px;">Opponent 1:</div>`;
      if (opponent1Teyaku && opponent1Teyaku.length > 0) {
        opp1HTML += opponent1Teyaku.map(t => {
          let cardList = '';
          if (t.cardsInvolved && t.cardsInvolved.length > 0) {
            cardList = ` [${t.cardsInvolved.map(c => c.name).join(', ')}]`;
          }
          return `<div style="font-size: 13px; color: #ccc;">  • ${t.name}: ${t.value} kan × ${fieldMultiplier} = ${t.value * fieldMultiplier} kan${cardList}</div>`;
        }).join('');
      } else {
        opp1HTML += '<div style="font-size: 13px; color: #999;">  No teyaku</div>';
      }
      opp1HTML += `<div style="font-weight: bold; color: ${opp1Payment >= 0 ? '#90ee90' : '#ff6b6b'}; margin-top: 8px;">Total: ${opp1Payment >= 0 ? '+' : ''}${opp1Payment} kan</div>`;
      opp1Section.innerHTML = opp1HTML;
      detailsDiv.appendChild(opp1Section);

      // Opponent 2 section
      const opp2Section = document.createElement('div');
      let opp2HTML = `<div style="font-weight: bold; color: #90ee90; margin-bottom: 8px;">Opponent 2:</div>`;
      if (opponent2Teyaku && opponent2Teyaku.length > 0) {
        opp2HTML += opponent2Teyaku.map(t => {
          let cardList = '';
          if (t.cardsInvolved && t.cardsInvolved.length > 0) {
            cardList = ` [${t.cardsInvolved.map(c => c.name).join(', ')}]`;
          }
          return `<div style="font-size: 13px; color: #ccc;">  • ${t.name}: ${t.value} kan × ${fieldMultiplier} = ${t.value * fieldMultiplier} kan${cardList}</div>`;
        }).join('');
      } else {
        opp2HTML += '<div style="font-size: 13px; color: #999;">  No teyaku</div>';
      }
      opp2HTML += `<div style="font-weight: bold; color: ${opp2Payment >= 0 ? '#90ee90' : '#ff6b6b'}; margin-top: 8px;">Total: ${opp2Payment >= 0 ? '+' : ''}${opp2Payment} kan</div>`;
      opp2Section.innerHTML = opp2HTML;
      detailsDiv.appendChild(opp2Section);

      modal.appendChild(detailsDiv);

      // Payment rule explanation and verification
      const ruleDiv = document.createElement('div');
      ruleDiv.style.cssText = `
        background: rgba(144, 238, 144, 0.1);
        border-left: 4px solid #90ee90;
        padding: 12px;
        margin-bottom: 20px;
        font-size: 13px;
        line-height: 1.6;
      `;
      const totalCheck = playerPayment + opp1Payment + opp2Payment;

      // Count players with teyaku
      const playersWithTeyakuList = [
        { value: playerTotal },
        { value: opp1Total },
        { value: opp2Total }
      ].filter(p => p.value > 0);
      const playersWithTeyakuCount = playersWithTeyakuList.length;

      let ruleText = '<strong style="color: #90ee90;">Payment Rule:</strong><br>';
      if (playersWithTeyakuCount === 0) {
        ruleText += 'No teyaku - no payments<br>';
      } else {
        ruleText += `Each player with teyaku collects their value from each other player (with ${fieldMultiplier}× field multiplier applied to all).<br>`;
      }
      ruleText += `<span style="color: ${totalCheck === 0 ? '#90ee90' : '#ff6b6b'};">Sum: ${totalCheck === 0 ? '✓ Balanced' : '✗ ERROR: ' + totalCheck + ' kan'}</span>`;

      ruleDiv.innerHTML = ruleText;
      modal.appendChild(ruleDiv);

      // Continue button
      const buttonDiv = document.createElement('div');
      buttonDiv.style.cssText = `
        display: flex;
        justify-content: center;
      `;

      const continueBtn = document.createElement('button');
      continueBtn.textContent = 'Start Main Game';
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
        if (onContinue) onContinue();
        resolve();
      });
      buttonDiv.appendChild(continueBtn);
      modal.appendChild(buttonDiv);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
  }
}
