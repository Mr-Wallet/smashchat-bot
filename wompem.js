module.exports = {
  DEFAULT_WOMPEM: 1000,

  getDailyWompEm: function getDailyWompEm() {
    return Math.floor(Math.random() * 20) + 90;
  }
};
