import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, goalBOT: string, durationDays: number) => Promise<void>;
  isSubmitting: boolean;
}

export const CreateCampaignForm: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [durationDays, setDurationDays] = useState('14');

  if (!isOpen) return null;

  // Validation
  const titleBytes = new TextEncoder().encode(title).length;
  const descBytes = new TextEncoder().encode(description).length;

  const isTitleValid = titleBytes >= 1 && titleBytes <= 100;
  const isDescValid = descBytes >= 1 && descBytes <= 1000;
  const goalNum = parseFloat(goal);
  const isGoalValid = !isNaN(goalNum) && goalNum > 0;
  const durationNum = parseInt(durationDays, 10);
  const isDurationValid = !isNaN(durationNum) && durationNum >= 1 && durationNum <= 90;

  const isValid = isTitleValid && isDescValid && isGoalValid && isDurationValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    await onSubmit(title.trim(), description.trim(), goal, durationNum);
    // Reset on success
    setTitle('');
    setDescription('');
    setGoal('');
    setDurationDays('14');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} title="Close">
          ✕
        </button>

        <div className="form-header">
          <h2>Start a Campaign</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <div className="form-label-row">
                <label htmlFor="title">Campaign Title</label>
                <span className={`char-counter ${titleBytes > 100 ? 'limit-reached' : ''}`}>
                  {title.length} / 100 chars
                </span>
              </div>
              <input
                id="title"
                className="form-input"
                type="text"
                placeholder="e.g. Open Source Hardware Kit"
                value={title}
                maxLength={100}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="form-group full-width">
              <div className="form-label-row">
                <label htmlFor="description">Description</label>
                <span className={`char-counter ${descBytes > 1000 ? 'limit-reached' : ''}`}>
                  {description.length} / 1000 chars
                </span>
              </div>
              <textarea
                id="description"
                className="form-textarea"
                placeholder="Explain the project, why funding is needed, and your roadmap..."
                value={description}
                maxLength={1000}
                rows={4}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="goal">Funding Goal (BOT)</label>
              </div>
              <input
                id="goal"
                className="form-input"
                type="number"
                step="any"
                min="0.0001"
                placeholder="e.g. 10.5"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="duration">Duration (1 - 90 Days)</label>
              </div>
              <input
                id="duration"
                className="form-input"
                type="number"
                min="1"
                max="90"
                step="1"
                placeholder="14"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" /> Creating...
                </>
              ) : (
                'Launch Campaign'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
