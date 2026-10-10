---
layout: null
---
{%- assign release_day = site.time | date: "%Y-%m-%d" -%}
{%- assign first_puzzle = true -%}
window.RICOCHET_PUBLISHED_PUZZLES = {
{%- for entry in site.data.ricochet_puzzles -%}
  {%- assign puzzle = entry[1] -%}
  {%- if puzzle.date and puzzle.date <= release_day -%}
    {%- unless first_puzzle -%},{%- endunless -%}
    {{- entry[0] | jsonify -}}:{{- puzzle | jsonify -}}
    {%- assign first_puzzle = false -%}
  {%- endif -%}
{%- endfor -%}
};
