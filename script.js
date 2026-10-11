(function () {
        "use strict";
        var passages = {
            words: [
              "Design grows clearer when every decision serves a purpose. Small details shape calm experiences and thoughtful interfaces reward patient attention.",
              "Creative work becomes stronger through steady practice. Build one useful thing, test it honestly, learn from the result and improve the next version.",
              "The quiet rhythm of focused work can turn a difficult idea into something simple, useful and surprisingly beautiful.",
            ],
            code: [
              "const total = items.reduce((sum, item) => sum + item.price, 0);",
              "function greet(name) { return 'Hello, ' + name + '!'; }",
              "button.addEventListener('click', () => panel.classList.toggle('open'));",
            ],
            punctuation: [
              "Wait—did the signal stop? No; it changed direction, twice, at 11:47 p.m.",
              "Build, test, review: then ask, “Does this solve the real problem?”",
              "Good tools feel quiet; they respond quickly, explain errors, and respect the user's time.",
            ],
          },
          $ = function (x) {
            return document.getElementById(x);
          },
          text = "",
          started = false,
          finished = false,
          startAt = 0,
          deadline = 0,
          interval = 0,
          index = 0,
          mode = "words";
        var unranked = false;
        function choose(newOne) {
          mode = $("mode").value;
          var list = passages[mode];
          if (newOne) index = (index + 1) % list.length;
          text = list[index];
          $("input").value = "";
          $("input").disabled = false;
          started = false;
          finished = false;
          clearInterval(interval);
          $("timer").textContent = $("duration").value;
          $("wpm").textContent = "0";
          $("accuracy").textContent = "100%";
          $("mistakes").textContent = "0";
          $("results").hidden = true;
          $("message").textContent = "";
          unranked = false;
          render();
        }
        function render() {
          var typed = $("input").value,
            html = "";
          for (var i = 0; i < text.length; i++) {
            var cls =
              i < typed.length
                ? typed[i] === text[i]
                  ? "correct"
                  : "wrong"
                : i === typed.length
                  ? "current"
                  : "future";
            html +=
              '<span class="' + cls + '">' + escapeHtml(text[i]) + "</span>";
          }
          $("passage").innerHTML = html;
          metrics();
        }
        function escapeHtml(c) {
          return (
            {
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
              " ": "&nbsp;",
            }[c] || c
          );
        }
        function values() {
          var typed = $("input").value,
            correct = 0,
            wrong = 0;
          for (var i = 0; i < typed.length; i++)
            typed[i] === text[i] ? correct++ : wrong++;
          var mins = started
              ? Math.max((Date.now() - startAt) / 60000, 1 / 60)
              : 1 / 60,
            gross = Math.round(typed.length / 5 / mins),
            net = Math.max(0, Math.round((correct - wrong) / 5 / mins)),
            acc = typed.length
              ? Math.round((correct / typed.length) * 100)
              : 100;
          return {
            typed: typed.length,
            correct: correct,
            wrong: wrong,
            gross: gross,
            net: net,
            acc: acc,
          };
        }
        function metrics() {
          var v = values();
          $("wpm").textContent = v.net;
          $("accuracy").textContent = v.acc + "%";
          $("mistakes").textContent = v.wrong;
        }
        function start() {
          started = true;
          startAt = Date.now();
          deadline = startAt + +$("duration").value * 1000;
          interval = setInterval(function () {
            var left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            $("timer").textContent = left;
            metrics();
            if (left <= 0) finish();
          }, 200);
        }
        function finish() {
          if (finished) return;
          finished = true;
          clearInterval(interval);
          $("input").disabled = true;
          var v = values(),
            eligibleScore = unranked ? 0 : v.net,
            best = Math.max(
              eligibleScore,
              Number(localStorage.getItem("velocity:best") || 0),
            );
          localStorage.setItem("velocity:best", best);
          $("finalWpm").textContent = v.net;
          $("grossWpm").textContent = v.gross;
          $("finalAccuracy").textContent = v.acc + "%";
          $("best").textContent = best;
          $("summary").textContent =
            "You typed " +
            v.typed +
            " characters with " +
            v.wrong +
            " mistakes." +
            (unranked ? " Paste was detected, so this run is unranked." : "");
          var typedText = $("input").value;
          var misses = {};
          for (var i = 0; i < typedText.length; i++) {
            if (typedText[i] !== text[i]) {
              var expected = text[i] === " " ? "space" : text[i] || "end";
              misses[expected] = (misses[expected] || 0) + 1;
            }
          }
          var hard = Object.keys(misses)
            .sort(function (a, b) { return misses[b] - misses[a]; })
            .slice(0, 5);
          $("hardKeys").textContent = hard.length ? hard.join(" · ") : "No weak keys — clean run";
          var history = JSON.parse(localStorage.getItem("velocity:runs") || "[]");
          history.unshift({ wpm: v.net, accuracy: v.acc, mistakes: v.wrong, mode: mode, ranked: !unranked });
          history = history.slice(0, 5);
          localStorage.setItem("velocity:runs", JSON.stringify(history));
          $("runHistory").innerHTML = history.map(function (run) {
            return '<div style="display:flex;justify-content:space-between;padding:10px 12px;border:1px solid #ffffff18;border-radius:10px"><span>' +
              escapeHtml(run.mode) + (run.ranked ? "" : " · unranked") + '</span><strong>' +
              run.wpm + ' WPM · ' + run.accuracy + '%</strong></div>';
          }).join("");
          $("results").hidden = false;
          $("results").scrollIntoView({
            behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
              ? "auto"
              : "smooth",
          });
        }
        $("input").oninput = function (e) {
          if (!started && $("input").value) start();
          if ($("input").value.length > text.length) {
            $("input").value = $("input").value.slice(0, text.length);
          }
          if (e.inputType === "insertFromPaste") {
            unranked = true;
            $("message").textContent =
              "Paste detected — this session is marked unranked.";
          }
          render();
          if ($("input").value.length >= text.length) finish();
        };
        $("restart").onclick = function () {
          choose(false);
        };
        $("next").onclick = function () {
          choose(true);
        };
        $("again").onclick = function () {
          choose(true);
          $("input").focus();
        };
        $("duration").onchange = function () {
          choose(false);
        };
        $("mode").onchange = function () {
          index = 0;
          choose(false);
        };
        choose(false);
      })();
