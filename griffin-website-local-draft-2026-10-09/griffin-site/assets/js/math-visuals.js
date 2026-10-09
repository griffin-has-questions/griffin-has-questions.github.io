(function () {
  "use strict";

  var lab = document.querySelector("[data-unit-circle]");
  if (!lab) return;

  var input = lab.querySelector("[data-angle-input]");
  var radius = lab.querySelector("[data-radius]");
  var point = lab.querySelector("[data-point]");
  var angleOutput = lab.querySelector("[data-angle]");
  var coordinateOutput = lab.querySelector("[data-coordinate]");

  var angleLabels = [
    "0", "π/6", "π/3", "π/2", "2π/3", "5π/6", "π",
    "7π/6", "4π/3", "3π/2", "5π/3", "11π/6", "2π"
  ];
  var coordinateLabels = [
    "(1, 0)", "(√3/2, 1/2)", "(1/2, √3/2)", "(0, 1)",
    "(−1/2, √3/2)", "(−√3/2, 1/2)", "(−1, 0)",
    "(−√3/2, −1/2)", "(−1/2, −√3/2)", "(0, −1)",
    "(1/2, −√3/2)", "(√3/2, −1/2)", "(1, 0)"
  ];

  function updateCircle() {
    var step = Number(input.value);
    var theta = step * Math.PI / 6;
    var x = 180 + 118 * Math.cos(theta);
    var y = 180 - 118 * Math.sin(theta);
    var angle = angleLabels[step];
    var coordinate = coordinateLabels[step];

    radius.setAttribute("x2", x.toFixed(2));
    radius.setAttribute("y2", y.toFixed(2));
    point.setAttribute("cx", x.toFixed(2));
    point.setAttribute("cy", y.toFixed(2));
    angleOutput.textContent = angle;
    coordinateOutput.textContent = "At " + angle + ", the point is " + coordinate + ".";
    input.setAttribute("aria-valuetext", angle + ", point " + coordinate);
  }

  input.addEventListener("input", updateCircle);
  updateCircle();
}());
