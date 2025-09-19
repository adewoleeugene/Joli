import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (questionData: QuestionFormData) => void;
  gameType: string;
}

interface QuestionFormData {
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  timeLimit: number;
  explanation?: string;
}

function AddQuestionModal({ isOpen, onClose, onSubmit, gameType }: AddQuestionModalProps) {
  const [formData, setFormData] = useState<QuestionFormData>({
    question: '',
    type: 'multiple_choice',
    options: ['', ''],
    correctAnswer: '',
    timeLimit: 60,
    explanation: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.question.trim()) {
      newErrors.question = 'Question is required';
    }

    if (!formData.correctAnswer.trim()) {
      newErrors.correctAnswer = 'Correct answer is required';
    }

    if (formData.type === 'multiple_choice') {
      const validOptions = formData.options?.filter(opt => opt.trim()) || [];
      if (validOptions.length < 2) {
        newErrors.options = 'At least 2 options are required for multiple choice';
      }
      if (formData.options && !formData.options.includes(formData.correctAnswer)) {
        newErrors.correctAnswer = 'Correct answer must be one of the options';
      }
    }

    if (formData.timeLimit <= 0) {
      newErrors.timeLimit = 'Time limit must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      question: '',
      type: 'multiple_choice',
      options: ['', ''],
      correctAnswer: '',
      timeLimit: 60,
      explanation: ''
    });
    setErrors({});
    onClose();
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(formData.options || [])];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    const newOptions = [...(formData.options || []), ''];
    setFormData({ ...formData, options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = formData.options?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, options: newOptions });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />
        
        <div className="relative bg-card rounded-lg shadow-xl transform transition-all w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="bg-card px-6 pt-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-card-foreground">Add New Question</h3>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Question *
                </label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                  placeholder="Enter your question here..."
                />
                {errors.question && (
                  <p className="mt-1 text-sm text-red-500">{errors.question}</p>
                )}
              </div>

              {/* Question Type */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-3">
                  Question Type
                </label>
                <div className="bg-muted p-1 rounded-lg inline-flex space-x-1">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'multiple_choice' })}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      formData.type === 'multiple_choice'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Multiple Choice
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'true_false' })}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      formData.type === 'true_false'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    True/False
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'short_answer' })}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      formData.type === 'short_answer'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Short Answer
                  </button>
                </div>
              </div>

              {/* Options for Multiple Choice */}
              {formData.type === 'multiple_choice' && (
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-3">
                    Answer Options *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {formData.options?.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-border rounded-md text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder={`Option ${index + 1}`}
                        />
                        {formData.options && formData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="p-2 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )) || []}
                  </div>
                  {formData.options && formData.options.length < 4 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:text-primary/80 transition-colors border border-dashed border-primary/30 rounded-md hover:border-primary/50"
                    >
                      <Plus className="w-4 h-4" />
                      Add Option ({formData.options?.length || 0}/4)
                    </button>
                  )}
                  {errors.options && (
                    <p className="mt-1 text-sm text-red-500">{errors.options}</p>
                  )}
                </div>
              )}

              {/* True/False Options */}
              {formData.type === 'true_false' && (
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Correct Answer *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="trueFalse"
                        value="True"
                        checked={formData.correctAnswer === 'True'}
                        onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                        className="mr-2"
                      />
                      True
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="trueFalse"
                        value="False"
                        checked={formData.correctAnswer === 'False'}
                        onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                        className="mr-2"
                      />
                      False
                    </label>
                  </div>
                </div>
              )}

              {/* Correct Answer for Multiple Choice */}
              {formData.type === 'multiple_choice' && (
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Correct Answer *
                  </label>
                  <select
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select correct answer</option>
                    {formData.options?.filter(opt => opt.trim()).map((option, index) => (
                      <option key={index} value={option}>{option}</option>
                    )) || []}
                  </select>
                  {errors.correctAnswer && (
                    <p className="mt-1 text-sm text-red-500">{errors.correctAnswer}</p>
                  )}
                </div>
              )}

              {/* Short Answer */}
              {formData.type === 'short_answer' && (
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Correct Answer *
                  </label>
                  <input
                    type="text"
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter the correct answer"
                  />
                  {errors.correctAnswer && (
                    <p className="mt-1 text-sm text-red-500">{errors.correctAnswer}</p>
                  )}
                </div>
              )}

              {/* Time Limit */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Time Limit (seconds) *
                </label>
                <input
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 60 })}
                  className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  min="1"
                  placeholder="Enter time limit in seconds"
                />
                {errors.timeLimit && (
                  <p className="mt-1 text-sm text-red-500">{errors.timeLimit}</p>
                )}
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Explanation (Optional)
                </label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={2}
                  placeholder="Provide an explanation for the correct answer..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-border rounded-md text-foreground bg-background hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddQuestionModal;
export type { QuestionFormData };