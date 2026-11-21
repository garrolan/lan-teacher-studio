(() => {
  "use strict";

  const types = {
    T: "是非", S: "單選", O: "拖曳排序", C: "分類",
    P: "連線配對", D: "下拉選擇", M: "勾選", X: "操作實驗"
  };
  const distribution = { T: 4, S: 5, O: 3, C: 3, P: 3, D: 2, M: 3, X: 2 };
  const split = (value, by = "/") => value.split(by).map(part => part.trim());

  function parseQuestion(line, id) {
    const [type, prompt, content, fourth, fifth, sixth] = split(line, "|");
    const question = { id, type, prompt, explanation: split(line, "|").at(-1) };
    if (type === "T") return { ...question, options: ["是", "非"], correct: Number(content) === 1 ? 0 : 1 };
    if (type === "O") return { ...question, items: split(content) };
    if (type === "P") {
      const pairs = split(content).map(item => split(item, ">"));
      return { ...question, items: pairs.map(pair => pair[0]), targets: pairs.map(pair => pair[1]), keys: pairs.map((_, i) => i) };
    }
    if (type === "C") {
      const pairs = split(fourth).map(item => split(item, ">"));
      return { ...question, items: pairs.map(pair => pair[0]), targets: split(content), keys: pairs.map(pair => Number(pair[1])) };
    }
    if (type === "X") {
      const steps = split(content).map(item => split(item, ">"));
      return { ...question, steps, options: split(fourth), correct: Number(fifth), explanation: sixth };
    }
    return {
      ...question, options: split(content),
      correct: type === "M" ? split(fourth, ",").map(Number) : Number(fourth)
    };
  }

  const banks = window.SCIENCE_BANK_TEXT.map(block => {
    const [header, ...lines] = block.trim().split(/\r?\n/);
    const [id, title, intro, scene] = split(header, "|");
    const questions = lines.map((line, i) => parseQuestion(line, `${id}-${i + 1}`));
    return { id, title, intro, scene, unit: Number(id[0]), questions };
  });

  function initialAnswer(question) {
    if (question.type === "M") return [];
    if (question.items) return question.items.map(() => null);
    return null;
  }

  function complete(question, answer, observed = []) {
    if (question.type === "M") return answer.length > 0;
    if (question.type === "X") return answer !== null && observed.length === question.steps.length;
    if (question.items) return answer.every(value => value !== null);
    return answer !== null;
  }

  function score(question, answer) {
    if (question.type === "M") {
      const hits = answer.filter(value => question.correct.includes(value)).length;
      const misses = answer.length - hits;
      const decoys = question.options.length - question.correct.length;
      return 4 * Math.max(0, hits / question.correct.length - misses / decoys);
    }
    if (question.items) {
      const correctCount = answer.filter((value, i) => value === (question.type === "O" ? i : question.keys[i])).length;
      return 4 * correctCount / question.items.length;
    }
    return answer === question.correct ? 4 : 0;
  }

  function correctText(question) {
    if (question.type === "O") return question.items.join(" → ");
    if (question.items) {
      return question.items.map((item, i) => `${item} → ${question.targets[question.keys[i]]}`).join("、");
    }
    if (question.type === "M") return question.correct.map(value => question.options[value]).join("、");
    return question.options[question.correct];
  }

  function shuffledIndices(length, random = Math.random) {
    const indices = Array.from({ length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }

  window.SCIENCE_MODEL = Object.freeze({
    types, distribution, banks, initialAnswer, complete, score, correctText, shuffledIndices
  });
})();
