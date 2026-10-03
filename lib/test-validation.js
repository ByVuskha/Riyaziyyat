'use strict';

const VALID_TYPES = new Set(['single-choice', 'multiple-choice', 'true-false', 'short-answer', 'numeric']);
const VALID_GRADES = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'all']);

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 200) {
    return 'Sınaqda 1–200 arası sual olmalıdır';
  }
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const number = index + 1;
    if (!question || typeof question !== 'object' || !String(question.question || question.text || '').trim()) {
      return `${number}-ci sualın mətni boş ola bilməz`;
    }
    if (String(question.question || question.text).length > 5000) return `${number}-ci sualın mətni çox uzundur`;
    const type = question.type || 'single-choice';
    if (!VALID_TYPES.has(type)) return `${number}-ci sualın növü tanınmır`;

    if (type === 'single-choice' || type === 'multiple-choice') {
      const options = question.options;
      if (!Array.isArray(options) || options.length < 2 || options.length > 6 || options.some(option => !String(option || '').trim() || String(option).length > 1000)) {
        return `${number}-ci sualda 2–6 arası dolu cavab variantı olmalıdır`;
      }
      if (type === 'single-choice') {
        const correct = Number.isInteger(question.correctAnswer)
          ? question.correctAnswer
          : ['A', 'B', 'C', 'D', 'E', 'F'].indexOf(String(question.correctAnswer || '').toUpperCase());
        if (correct < 0 || correct >= options.length) return `${number}-ci sualın düzgün variantı seçilməyib`;
      } else {
        const answers = question.correctAnswer;
        if (!Array.isArray(answers) || !answers.length || answers.some(answer => !Number.isInteger(answer) || answer < 0 || answer >= options.length) || new Set(answers).size !== answers.length) {
          return `${number}-ci sualda ən azı bir düzgün variant seçilməlidir`;
        }
      }
    } else if (type === 'true-false') {
      if (![0, 1].includes(Number(question.correctAnswer))) return `${number}-ci sualda doğru/yanlış cavabı seçilməlidir`;
    } else if (type === 'short-answer') {
      const answers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
      if (!answers.length || answers.some(answer => !String(answer || '').trim() || String(answer).length > 500)) {
        return `${number}-ci sualın düzgün qısa cavabı daxil edilməlidir`;
      }
    } else {
      const answer = Number(question.correctAnswer);
      const tolerance = Number(question.answerTolerance || 0);
      if (!Number.isFinite(answer) || !Number.isFinite(tolerance) || tolerance < 0) {
        return `${number}-ci sualın ədədi cavabı və qəbul edilən xətası düzgün olmalıdır`;
      }
    }
  }
  return null;
}

function validateCurriculum(grade, topic) {
  if (!VALID_GRADES.has(String(grade || '').trim())) return 'Sinif seçilməlidir';
  if (!String(topic || '').trim() || String(topic).trim().length > 100) return 'Riyaziyyat mövzusu daxil edilməlidir (ən çox 100 simvol)';
  return null;
}

module.exports = { validateQuestions, validateCurriculum };
