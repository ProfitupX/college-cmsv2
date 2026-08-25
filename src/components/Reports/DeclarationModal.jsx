import React, { useState } from 'react';

const DeclarationModal = ({ isOpen, onClose, onSubmit, session }) => {
  const [formData, setFormData] = useState({
    conductedAsPerPlan: 'Yes',
    classesPlanned: '20',
    classesTaken: '23',
    resultOpinion: 'Moderate / Good',
    lessThan75: 'No',
    reasonForFailures: '-',
    lessThanPrevTest: 'No',
    reasonForPrevTest: '-',
    remedialActions: session?.remedial_action || 'Regular Writing practice with the previous year Anna University Questions.',
    principalSuggestions: '-'
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Declaration by Staff</h3>
            <p className="text-sm text-gray-500">Please fill out this section for the Subject Analysis Report.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="px-6 py-4 overflow-y-auto custom-scrollbar flex-1">
          <form id="declarationForm" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 text-sm tracking-wider uppercase">I Certify that:</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    a) Classes conducted as per course plan?
                  </label>
                  <select 
                    name="conductedAsPerPlan" 
                    value={formData.conductedAsPerPlan} 
                    onChange={handleChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    c) Result opinion:
                  </label>
                  <input 
                    type="text" 
                    name="resultOpinion" 
                    value={formData.resultOpinion} 
                    onChange={handleChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    b) Number of classes Planned:
                  </label>
                  <input 
                    type="number" 
                    name="classesPlanned" 
                    value={formData.classesPlanned} 
                    onChange={handleChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Actually Taken:
                  </label>
                  <input 
                    type="number" 
                    name="classesTaken" 
                    value={formData.classesTaken} 
                    onChange={handleChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    3. Is the pass percentage less than 75%?
                  </label>
                  <select 
                    name="lessThan75" 
                    value={formData.lessThan75} 
                    onChange={handleChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    4. Reason for more failures:
                  </label>
                  <input 
                    type="text" 
                    name="reasonForFailures" 
                    value={formData.reasonForFailures} 
                    onChange={handleChange}
                    disabled={formData.lessThan75 === 'No'}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    5. Pass percentage &lt; previous test?
                  </label>
                  <select 
                    name="lessThanPrevTest" 
                    value={formData.lessThanPrevTest} 
                    onChange={handleChange}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    6. Reason:
                  </label>
                  <input 
                    type="text" 
                    name="reasonForPrevTest" 
                    value={formData.reasonForPrevTest} 
                    onChange={handleChange}
                    disabled={formData.lessThanPrevTest === 'No'}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  7. Plan of Remedial actions to improve pass percentage:
                </label>
                <textarea 
                  name="remedialActions" 
                  value={formData.remedialActions} 
                  onChange={handleChange}
                  rows="2"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  8. Principal's suggestions to improve pass percentage:
                </label>
                <input 
                  type="text" 
                  name="principalSuggestions" 
                  value={formData.principalSuggestions} 
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="declarationForm"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Generate Report
          </button>
        </div>

      </div>
    </div>
  );
};

export default DeclarationModal;
