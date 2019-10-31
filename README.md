# rum-agent-payload

Testing Optimisations for payload size of Elastic RUM agent.

### Scenario

- Stack - 7.4.0
- JS Agent: 4.5.1
- No of Spans
  - 50 JS files
  - 3 Custom spans (Parsing document, DOM interactive etc)
  - Metricsets - 4 for page-load

### Comparision

| Name of the test               | Payload Size (approx bytes) |
| :----------------------------- | :-------------------------: |
| Current release                |            24600            |
| Spans inside transaction       |            18300            |
| Removing unnecessary fields    |            13300            |
| Breakdown inside transaction   |            12800            |
| Transaction field compression  |            8800             |
| Spans format as Optimised Trie |            5180             |
