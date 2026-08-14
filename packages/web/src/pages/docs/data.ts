export const sections = [
  { id: "getting-started", label: "Getting Started" },
  { id: "creation", label: "Array creation" },
  { id: "shape", label: "Shape manipulation" },
  { id: "elementwise", label: "Element-wise" },
  { id: "reductions", label: "Reductions" },
  { id: "linalg", label: "Linear algebra" },
  { id: "ndarray", label: "NdArray memory" },
  { id: "dev-notes", label: "Dev notes & roadmap" },
];

export interface Param {
  name: string;
  type: string;
  desc: string;
  default?: string;
}

export interface ApiMethod {
  name: string;
  signature: string;
  summary: string;
  parameters: Param[];
  returns: { name?: string; type: string; desc: string };
  notes?: string;
  examples?: string[];
  seeAlso?: string[];
}

export interface ApiGroup {
  title: string;
  desc: string;
  methods: ApiMethod[];
}

export const apiGroups: Record<string, ApiGroup> = {
  creation: {
    title: "Array creation",
    desc: "Build arrays from shapes, ranges, seeds, or plain JS data. Every creation function allocates its storage in WASM memory.",
    methods: [
      {
        name: "array",
        signature: "nw.array(jsData)",
        summary: "Create an NdArray from nested JS arrays, inferring the shape.",
        parameters: [
          {
            name: "jsData",
            type: "number[] | number[][] | number[][][]",
            desc: "Nested arrays of numbers. Accepts 1-D, 2-D, or 3-D data; the input must be rectangular.",
          },
        ],
        returns: {
          type: "NdArray",
          desc: "A copy of the input data stored in WASM memory.",
        },
        notes: "The input is copied on creation — later mutations to the JS arrays do not affect the NdArray.",
        examples: [
          ">>> nw.array([1, 2, 3]).toArray()",
          "[1, 2, 3]",
          ">>> nw.array([[1, 2], [3, 4]]).shape",
          "[2, 2]",
        ],
        seeAlso: ["zeros", "ones", "full", "random"],
      },
      {
        name: "zeros",
        signature: "nw.zeros(shape)",
        summary: "Return a new array of the given shape, filled with zeros.",
        parameters: [
          { name: "shape", type: "number[]", desc: "Dimensions of the new array." },
        ],
        returns: { type: "NdArray", desc: "Array of zeros with the requested shape." },
        examples: [">>> nw.zeros([2, 3]).toArray()", "[[0, 0, 0], [0, 0, 0]]"],
        seeAlso: ["ones", "full", "array"],
      },
      {
        name: "ones",
        signature: "nw.ones(shape)",
        summary: "Return a new array of the given shape, filled with ones.",
        parameters: [
          { name: "shape", type: "number[]", desc: "Dimensions of the new array." },
        ],
        returns: { type: "NdArray", desc: "Array of ones with the requested shape." },
        examples: [">>> nw.ones([2, 2]).toArray()", "[[1, 1], [1, 1]]"],
        seeAlso: ["zeros", "full", "array"],
      },
      {
        name: "full",
        signature: "nw.full(shape, value)",
        summary: "Return a new array of the given shape, filled with a single value.",
        parameters: [
          { name: "shape", type: "number[]", desc: "Dimensions of the new array." },
          { name: "value", type: "number", desc: "Fill value placed in every element." },
        ],
        returns: { type: "NdArray", desc: "Array filled with value." },
        examples: [">>> nw.full([2, 3], 7).toArray()", "[[7, 7, 7], [7, 7, 7]]"],
        seeAlso: ["zeros", "ones"],
      },
      {
        name: "arange",
        signature: "nw.arange(start, stop, step)",
        summary: "Return evenly spaced values within a given interval.",
        parameters: [
          { name: "start", type: "number", desc: "Start of the interval, inclusive." },
          { name: "stop", type: "number", desc: "End of the interval, exclusive." },
          { name: "step", type: "number", desc: "Spacing between values. Must be non-zero." },
        ],
        returns: { type: "1-D NdArray", desc: "Values from start to stop, spaced by step." },
        notes: "Unlike NumPy, step has no default — all three arguments are required.",
        examples: [
          ">>> nw.arange(0, 6, 2).toArray()",
          "[0, 2, 4]",
          ">>> nw.arange(3, 1, -1).toArray()",
          "[3, 2]",
        ],
        seeAlso: ["linspace"],
      },
      {
        name: "linspace",
        signature: "nw.linspace(start, stop, count)",
        summary: "Return count evenly spaced samples over a closed interval.",
        parameters: [
          { name: "start", type: "number", desc: "Start of the interval, inclusive." },
          { name: "stop", type: "number", desc: "End of the interval, inclusive." },
          { name: "count", type: "number", desc: "Number of samples to generate." },
        ],
        returns: { type: "1-D NdArray", desc: "count points between start and stop, endpoints included." },
        examples: [">>> nw.linspace(0, 1, 5).toArray()", "[0, 0.25, 0.5, 0.75, 1]"],
        seeAlso: ["arange"],
      },
      {
        name: "random",
        signature: "nw.random(shape, seed)",
        summary: "Return samples drawn from a uniform distribution in [0, 1).",
        parameters: [
          { name: "shape", type: "number[]", desc: "Dimensions of the output array." },
          { name: "seed", type: "number", desc: "Seed for the PRNG. Same seed, same sequence." },
        ],
        returns: { type: "NdArray", desc: "Uniform [0, 1) samples of the requested shape." },
        notes: "Deterministic for a given seed — useful for reproducible weight initialization and noise.",
        examples: [
          ">>> nw.random([2, 2], 42).toArray()",
          "[[0.3745, 0.9507], [0.7319, 0.5987]]",
        ],
        seeAlso: ["array"],
      },
    ],
  },
  shape: {
    title: "Shape manipulation",
    desc: "Reorganize and index arrays. The library is copy-based — every operation returns a fresh array, there are no views.",
    methods: [
      {
        name: "reshape",
        signature: "nw.reshape(a, newShape)",
        summary: "Give a new shape to an array without changing its data.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Array to be reshaped." },
          {
            name: "newShape",
            type: "number[]",
            desc: "The new shape. Must be compatible with the original — the total number of elements must match.",
          },
        ],
        returns: {
          type: "NdArray",
          desc: "The same elements, arranged into the new shape (a copy in row-major order).",
        },
        notes: "The total number of elements must be preserved. If it is not, the operation throws.",
        examples: [
          ">>> const a = nw.arange(0, 6);",
          ">>> nw.reshape(a, [2, 3]).toArray()",
          "[[0, 1, 2], [3, 4, 5]]",
        ],
        seeAlso: ["flatten", "transpose", "squeeze"],
      },
      {
        name: "transpose",
        signature: "nw.transpose(a)",
        summary: "Reverse the order of the axes.",
        parameters: [{ name: "a", type: "NdArray", desc: "Input array." }],
        returns: { type: "NdArray", desc: "Array with axes reversed. For 2-D this swaps rows and columns." },
        examples: [
          ">>> const m = nw.array([[0, 1, 2], [3, 4, 5]]);",
          ">>> nw.transpose(m).toArray()",
          "[[0, 3], [1, 4], [2, 5]]",
        ],
        seeAlso: ["reshape"],
      },
      {
        name: "flatten",
        signature: "nw.flatten(a)",
        summary: "Collapse an array into a single 1-D row.",
        parameters: [{ name: "a", type: "NdArray", desc: "Input array." }],
        returns: { type: "1-D NdArray", desc: "Elements of a in row-major order." },
        examples: [
          ">>> nw.flatten(nw.array([[1, 2], [3, 4]])).toArray()",
          "[1, 2, 3, 4]",
        ],
        seeAlso: ["reshape", "squeeze"],
      },
      {
        name: "squeeze",
        signature: "nw.squeeze(a)",
        summary: "Remove all dimensions of size 1 from the shape.",
        parameters: [{ name: "a", type: "NdArray", desc: "Input array." }],
        returns: { type: "NdArray", desc: "Array with every length-1 axis removed." },
        examples: [
          ">>> nw.squeeze(nw.zeros([1, 3, 1])).shape",
          "[3]",
        ],
        seeAlso: ["reshape"],
      },
      {
        name: "slice",
        signature: "nw.slice(a, dim, start, stop, step)",
        summary: "Extract a range of elements along a single axis.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "dim", type: "number", desc: "Axis to slice along." },
          { name: "start", type: "number", desc: "Start index, inclusive." },
          { name: "stop", type: "number", desc: "Stop index, exclusive." },
          { name: "step", type: "number", desc: "Step between indices.", default: "1" },
        ],
        returns: { type: "NdArray", desc: "The selected range along dim." },
        notes: "Slice one axis at a time — call repeatedly to slice multiple axes.",
        examples: [
          ">>> const m = nw.array([[0, 1, 2], [3, 4, 5]]);",
          ">>> nw.slice(m, 1, 1, 3).toArray()",
          "[[1, 2], [4, 5]]",
        ],
        seeAlso: ["indexAxis"],
      },
      {
        name: "indexAxis",
        signature: "nw.indexAxis(a, dim, index)",
        summary: "Select a single index along one axis, removing that dimension.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "dim", type: "number", desc: "Axis to index into." },
          { name: "index", type: "number", desc: "Index along dim." },
        ],
        returns: { type: "NdArray", desc: "Array with dim removed, containing the selected slice." },
        examples: [
          ">>> const m = nw.array([[0, 1, 2], [3, 4, 5]]);",
          ">>> nw.indexAxis(m, 0, 1).toArray()",
          "[3, 4, 5]",
        ],
        seeAlso: ["slice"],
      },
    ],
  },
  elementwise: {
    title: "Element-wise",
    desc: "Broadcast-aware binary ops and per-element unary ops. Every binary op follows NumPy broadcasting rules.",
    methods: [
      {
        name: "add",
        signature: "nw.add(a, b)",
        summary: "Add two arrays element-wise.",
        parameters: [
          { name: "a", type: "NdArray", desc: "First operand." },
          { name: "b", type: "NdArray", desc: "Second operand. Must be broadcast-compatible with a." },
        ],
        returns: { type: "NdArray", desc: "Element-wise sum." },
        examples: [
          ">>> nw.add(nw.ones([2, 2]), nw.full([2, 2], 3)).toArray()",
          "[[4, 4], [4, 4]]",
          ">>> nw.add(nw.array([[1, 2]]), nw.array([[3], [4]])).toArray()",
          "[[4, 5], [5, 6]]",
        ],
        seeAlso: ["subtract", "multiply", "divide", "addScalar"],
      },
      {
        name: "subtract",
        signature: "nw.subtract(a, b)",
        summary: "Subtract two arrays element-wise.",
        parameters: [
          { name: "a", type: "NdArray", desc: "First operand." },
          { name: "b", type: "NdArray", desc: "Second operand. Must be broadcast-compatible with a." },
        ],
        returns: { type: "NdArray", desc: "Element-wise a − b." },
        seeAlso: ["add", "multiply", "divide"],
      },
      {
        name: "multiply",
        signature: "nw.multiply(a, b)",
        summary: "Multiply two arrays element-wise.",
        parameters: [
          { name: "a", type: "NdArray", desc: "First operand." },
          { name: "b", type: "NdArray", desc: "Second operand. Must be broadcast-compatible with a." },
        ],
        returns: { type: "NdArray", desc: "Element-wise a × b." },
        seeAlso: ["add", "divide", "mulScalar"],
      },
      {
        name: "divide",
        signature: "nw.divide(a, b)",
        summary: "Divide two arrays element-wise.",
        parameters: [
          { name: "a", type: "NdArray", desc: "First operand." },
          { name: "b", type: "NdArray", desc: "Second operand. Must be broadcast-compatible with a." },
        ],
        returns: { type: "NdArray", desc: "Element-wise a / b." },
        notes: "Division by zero yields Infinity or NaN, matching IEEE-754 behavior.",
        seeAlso: ["add", "multiply"],
      },
      {
        name: "negate",
        signature: "nw.negate(a)",
        summary: "Negate every element.",
        parameters: [{ name: "a", type: "NdArray", desc: "Input array." }],
        returns: { type: "NdArray", desc: "Element-wise −a." },
        examples: [">>> nw.negate(nw.array([1, -2])).toArray()", "[-1, 2]"],
        seeAlso: ["abs"],
      },
      {
        name: "abs",
        signature: "nw.abs(a)",
        summary: "Absolute value of every element.",
        parameters: [{ name: "a", type: "NdArray", desc: "Input array." }],
        returns: { type: "NdArray", desc: "Element-wise |a|." },
        examples: [">>> nw.abs(nw.array([1, -2])).toArray()", "[1, 2]"],
        seeAlso: ["negate", "maximum"],
      },
      {
        name: "sqrt",
        signature: "nw.sqrt(a)",
        summary: "Square root of every element.",
        parameters: [{ name: "a", type: "NdArray", desc: "Input array." }],
        returns: { type: "NdArray", desc: "Element-wise √a." },
        notes: "sqrt of negative values produces NaN, matching IEEE-754 behavior.",
        seeAlso: ["exp", "log"],
      },
      {
        name: "exp",
        signature: "nw.exp(a)",
        summary: "Exponential of every element.",
        parameters: [{ name: "a", type: "NdArray", desc: "Input array." }],
        returns: { type: "NdArray", desc: "Element-wise e^a." },
        notes: "The building block for softmax: exp(Z) divided by the per-column sum.",
        seeAlso: ["log", "sqrt"],
      },
      {
        name: "log",
        signature: "nw.log(a)",
        summary: "Natural logarithm of every element.",
        parameters: [{ name: "a", type: "NdArray", desc: "Input array." }],
        returns: { type: "NdArray", desc: "Element-wise ln(a)." },
        notes: "log of non-positive values produces NaN or -Infinity, matching IEEE-754 behavior.",
        seeAlso: ["exp", "sqrt"],
      },
      {
        name: "maximum",
        signature: "nw.maximum(a, b)",
        summary: "Element-wise maximum of two arrays.",
        parameters: [
          { name: "a", type: "NdArray", desc: "First operand." },
          { name: "b", type: "NdArray", desc: "Second operand. Must be broadcast-compatible with a." },
        ],
        returns: { type: "NdArray", desc: "The larger value at each position." },
        examples: [
          ">>> nw.maximum(nw.array([1, 5, 2]), nw.array([3, 3, 3])).toArray()",
          "[3, 5, 3]",
        ],
        seeAlso: ["minimum", "maximumScalar", "max"],
      },
      {
        name: "minimum",
        signature: "nw.minimum(a, b)",
        summary: "Element-wise minimum of two arrays.",
        parameters: [
          { name: "a", type: "NdArray", desc: "First operand." },
          { name: "b", type: "NdArray", desc: "Second operand. Must be broadcast-compatible with a." },
        ],
        returns: { type: "NdArray", desc: "The smaller value at each position." },
        seeAlso: ["maximum", "minimumScalar", "min"],
      },
      {
        name: "greater",
        signature: "nw.greater(a, b)",
        summary: "Element-wise greater-than comparison.",
        parameters: [
          { name: "a", type: "NdArray", desc: "First operand." },
          { name: "b", type: "NdArray", desc: "Second operand. Must be broadcast-compatible with a." },
        ],
        returns: { type: "NdArray", desc: "Binary mask: 1.0 where a > b, else 0.0." },
        notes: "Comparisons compose into masks and one-hot encodings.",
        examples: [">>> nw.greater(nw.array([1, 5]), nw.array([3, 3])).toArray()", "[0, 1]"],
        seeAlso: ["less", "equal", "greaterScalar"],
      },
      {
        name: "less",
        signature: "nw.less(a, b)",
        summary: "Element-wise less-than comparison.",
        parameters: [
          { name: "a", type: "NdArray", desc: "First operand." },
          { name: "b", type: "NdArray", desc: "Second operand. Must be broadcast-compatible with a." },
        ],
        returns: { type: "NdArray", desc: "Binary mask: 1.0 where a < b, else 0.0." },
        seeAlso: ["greater", "equal", "lessScalar"],
      },
      {
        name: "equal",
        signature: "nw.equal(a, b)",
        summary: "Element-wise equality comparison.",
        parameters: [
          { name: "a", type: "NdArray", desc: "First operand." },
          { name: "b", type: "NdArray", desc: "Second operand. Must be broadcast-compatible with a." },
        ],
        returns: { type: "NdArray", desc: "Binary mask: 1.0 where a == b, else 0.0." },
        notes: "The standard trick for one-hot encoding: broadcast an (m, 1) labels array against a (c,) class vector.",
        examples: [
          ">>> nw.equal(nw.array([1, 2]), nw.array([2, 2])).toArray()",
          "[0, 1]",
        ],
        seeAlso: ["greater", "less", "equalScalar"],
      },
      {
        name: "addScalar",
        signature: "nw.addScalar(a, value)",
        summary: "Add a scalar to every element.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "value", type: "number", desc: "Scalar to add." },
        ],
        returns: { type: "NdArray", desc: "Element-wise a + value." },
        notes: "Fast path — no broadcasting machinery needed for a single scalar.",
        seeAlso: ["mulScalar", "add"],
      },
      {
        name: "mulScalar",
        signature: "nw.mulScalar(a, value)",
        summary: "Multiply every element by a scalar.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "value", type: "number", desc: "Scalar multiplier." },
        ],
        returns: { type: "NdArray", desc: "Element-wise a × value." },
        seeAlso: ["addScalar", "multiply"],
      },
      {
        name: "maximumScalar",
        signature: "nw.maximumScalar(a, value)",
        summary: "Element-wise maximum against a scalar.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "value", type: "number", desc: "Scalar to compare against." },
        ],
        returns: { type: "NdArray", desc: "Element-wise max(a, value)." },
        notes: "maximumScalar(a, 0) is the ReLU activation.",
        examples: [
          ">>> nw.maximumScalar(nw.array([-1, 0, 2]), 0).toArray()",
          "[0, 0, 2]",
        ],
        seeAlso: ["minimumScalar", "maximum"],
      },
      {
        name: "minimumScalar",
        signature: "nw.minimumScalar(a, value)",
        summary: "Element-wise minimum against a scalar.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "value", type: "number", desc: "Scalar to compare against." },
        ],
        returns: { type: "NdArray", desc: "Element-wise min(a, value)." },
        seeAlso: ["maximumScalar", "minimum"],
      },
      {
        name: "greaterScalar",
        signature: "nw.greaterScalar(a, value)",
        summary: "Element-wise greater-than against a scalar.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "value", type: "number", desc: "Scalar to compare against." },
        ],
        returns: { type: "NdArray", desc: "Binary mask: 1.0 where a > value, else 0.0." },
        notes: "greaterScalar(a, 0) is the ReLU derivative.",
        seeAlso: ["lessScalar", "equalScalar", "greater"],
      },
      {
        name: "lessScalar",
        signature: "nw.lessScalar(a, value)",
        summary: "Element-wise less-than against a scalar.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "value", type: "number", desc: "Scalar to compare against." },
        ],
        returns: { type: "NdArray", desc: "Binary mask: 1.0 where a < value, else 0.0." },
        seeAlso: ["greaterScalar", "equalScalar", "less"],
      },
      {
        name: "equalScalar",
        signature: "nw.equalScalar(a, value)",
        summary: "Element-wise equality against a scalar.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "value", type: "number", desc: "Scalar to compare against." },
        ],
        returns: { type: "NdArray", desc: "Binary mask: 1.0 where a == value, else 0.0." },
        seeAlso: ["greaterScalar", "lessScalar", "equal"],
      },
      {
        name: "where",
        signature: "nw.where(a, mask)",
        summary: "Select the elements of a where mask is non-zero.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Array of values to select from." },
          { name: "mask", type: "number[]", desc: "Flat mask, one entry per element of a. Non-zero selects." },
        ],
        returns: { type: "1-D NdArray", desc: "Flat array of the selected elements, in order." },
        examples: [
          ">>> nw.where(nw.array([10, 20, 30]), [1, 0, 1]).toArray()",
          "[10, 30]",
        ],
        seeAlso: ["equal", "indexAxis"],
      },
    ],
  },
  reductions: {
    title: "Reductions",
    desc: "Aggregate values across the whole array or along one axis. Each reduction takes an optional { axis } option: axis selects the dimension to collapse (0 reduces rows, 1 reduces columns) and the result keeps the remaining dimensions. Without { axis } a reduction returns a plain number; with it the result is an NdArray. Only one axis at a time — there is no tuple support.",
    methods: [
      {
        name: "sum",
        signature: "nw.sum(a, opts?)",
        summary: "Sum of the array elements.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "opts", type: "{ axis?: number }", desc: "If given, reduce only along that axis.", default: "None" },
        ],
        returns: { type: "number | NdArray", desc: "The total, or per-slice sums along axis." },
        examples: [
          ">>> nw.sum(nw.array([[1, 2], [3, 4]]))",
          "10",
          ">>> nw.sum(nw.array([[1, 2], [3, 4]]), { axis: 0 }).toArray()",
          "[4, 6]",
        ],
        seeAlso: ["mean", "prod", "max", "min"],
      },
      {
        name: "mean",
        signature: "nw.mean(a, opts?)",
        summary: "Arithmetic mean of the array elements.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "opts", type: "{ axis?: number }", desc: "If given, reduce only along that axis.", default: "None" },
        ],
        returns: { type: "number | NdArray", desc: "The average, or per-slice means along axis." },
        seeAlso: ["sum", "prod"],
      },
      {
        name: "prod",
        signature: "nw.prod(a, opts?)",
        summary: "Product of the array elements.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "opts", type: "{ axis?: number }", desc: "If given, reduce only along that axis.", default: "None" },
        ],
        returns: { type: "number | NdArray", desc: "The product, or per-slice products along axis." },
        seeAlso: ["sum", "mean"],
      },
      {
        name: "max",
        signature: "nw.max(a, opts?)",
        summary: "Largest element of the array.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "opts", type: "{ axis?: number }", desc: "If given, reduce only along that axis.", default: "None" },
        ],
        returns: { type: "number | NdArray", desc: "The maximum, or the maximum of each slice along axis." },
        seeAlso: ["min", "maximum", "argmax"],
      },
      {
        name: "min",
        signature: "nw.min(a, opts?)",
        summary: "Smallest element of the array.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "opts", type: "{ axis?: number }", desc: "If given, reduce only along that axis.", default: "None" },
        ],
        returns: { type: "number | NdArray", desc: "The minimum, or the minimum of each slice along axis." },
        seeAlso: ["max", "minimum", "argmin"],
      },
      {
        name: "argmax",
        signature: "nw.argmax(a, opts?)",
        summary: "Index of the first occurrence of the maximum value.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "opts", type: "{ axis?: number }", desc: "If given, return the best index per slice along axis.", default: "None" },
        ],
        returns: { type: "number | NdArray", desc: "The extremum index, or the index of each slice." },
        examples: [
          ">>> nw.argmax(nw.array([3, 1, 2]))",
          "0",
          ">>> nw.argmax(nw.array([[1, 2], [3, 4]]), { axis: 1 }).toArray()",
          "[1, 1]",
        ],
        seeAlso: ["argmin", "max"],
      },
      {
        name: "argmin",
        signature: "nw.argmin(a, opts?)",
        summary: "Index of the first occurrence of the minimum value.",
        parameters: [
          { name: "a", type: "NdArray", desc: "Input array." },
          { name: "opts", type: "{ axis?: number }", desc: "If given, return the best index per slice along axis.", default: "None" },
        ],
        returns: { type: "number | NdArray", desc: "The extremum index, or the index of each slice." },
        seeAlso: ["argmax", "min"],
      },
    ],
  },
  linalg: {
    title: "Linear algebra",
    desc: "Dot products and matrix multiplication over the flat row-major layout.",
    methods: [
      {
        name: "dot",
        signature: "nw.dot(a, b)",
        summary: "Inner product of two 1-D arrays.",
        parameters: [
          { name: "a", type: "1-D NdArray", desc: "First vector." },
          { name: "b", type: "1-D NdArray", desc: "Second vector, same length as a." },
        ],
        returns: { type: "number", desc: "Sum of a[i] × b[i]." },
        examples: [">>> nw.dot(nw.array([1, 2, 3]), nw.array([4, 5, 6]))", "32"],
        seeAlso: ["matmul"],
      },
      {
        name: "matmul",
        signature: "nw.matmul(a, b)",
        summary: "Matrix product of two 2-D arrays.",
        parameters: [
          { name: "a", type: "2-D NdArray", desc: "First matrix, shape (m, k)." },
          { name: "b", type: "2-D NdArray", desc: "Second matrix, shape (k, n)." },
        ],
        returns: { type: "2-D NdArray", desc: "Matrix product of shape (m, n)." },
        notes: "The inner dimensions (k) must match, otherwise the operation throws.",
        examples: [
          ">>> nw.matmul(nw.array([[1, 0], [0, 1]]), nw.array([[2], [3]])).toArray()",
          "[[2], [3]]",
        ],
        seeAlso: ["dot", "outer"],
      },
      {
        name: "outer",
        signature: "nw.outer(a, b)",
        summary: "Outer product of two 1-D arrays.",
        parameters: [
          { name: "a", type: "1-D NdArray", desc: "First vector." },
          { name: "b", type: "1-D NdArray", desc: "Second vector." },
        ],
        returns: { type: "2-D NdArray", desc: "Shape [len(a), len(b)] where out[i][j] = a[i] × b[j]." },
        seeAlso: ["matmul", "dot"],
      },
      {
        name: "broadcastShapes",
        signature: "nw.broadcastShapes(a, b)",
        summary: "Compute the broadcast shape of two shapes without allocating.",
        parameters: [
          { name: "a", type: "number[]", desc: "First shape." },
          { name: "b", type: "number[]", desc: "Second shape." },
        ],
        returns: { type: "number[]", desc: "The resulting broadcast shape." },
        examples: [
          ">>> nw.broadcastShapes([2, 1], [1, 3])",
          "[2, 3]",
          ">>> nw.broadcastShapes([1, 4], [2, 1])",
          "[2, 4]",
        ],
        seeAlso: ["add"],
      },
    ],
  },
};

export type MethodRoute = {
  groupId: string;
  groupTitle: string;
  method: ApiMethod;
};

export const methodRoutes: MethodRoute[] = Object.entries(apiGroups).flatMap(
  ([groupId, group]) =>
    group.methods.map((method) => ({ groupId, groupTitle: group.title, method })),
);

export const methodRouteFor = (name: string): MethodRoute | undefined =>
  methodRoutes.find((r) => r.method.name === name);

export const code = {
  install: `# Node >= 18 — Node, bundlers, and browsers
npm install @felixfern/num-wasm`,

  init: `import { NumWasm } from "@felixfern/num-wasm";

const nw = await NumWasm.init();`,

  quickstart: `const a = nw.array([[1, 2, 3], [4, 5, 6]]);
const b = nw.ones([2, 3]);
const c = nw.add(a, b);           // broadcasting
const s = nw.sum(c, { axis: 0 });

console.log(s.toArray());         // [7, 9, 11]
a.free(); b.free(); c.free();     // optional — GC auto-frees`,

  browser: `import { NumWasm } from "@felixfern/num-wasm/browser";

const nw = await NumWasm.init(); // loads the .wasm via fetch`,

  ndarray: `const s = nw.sum(nw.array([[1, 2], [3, 4]]), { axis: 0 });
console.log(s.toArray());        // [4, 6]
const copy = s.toTypedArray();   // Float64Array copy
s.free();                        // release WASM memory — idempotent
s.free();                        // safe to call again`,
};

export const devWarnings = [
  {
    warning: "No WASM binary found",
    cause: "Running tests or the build before compiling the Zig kernel",
    fix: "Run `zig build wasm` first — prepublishOnly rebuilds it on publish",
  },
  {
    warning: "Call before init",
    cause: "Using NumWasm methods before await NumWasm.init() resolves",
    fix: "Initialize once at module scope and await it",
  },
  {
    warning: "Memory growth in tight loops",
    cause: "Forgetting .free() on intermediates — the registry only fires on GC",
    fix: "Call .free() on intermediates each iteration for deterministic reuse",
  },
  {
    warning: "Double .free()",
    cause: "Freeing the same NdArray twice",
    fix: "Nothing to do — .free() is idempotent and safe to repeat",
  },
];

export const designChoices = [
  {
    title: "f64 only",
    desc: "No dtype enum, no generic type dispatch. One type, predictable perf.",
  },
  {
    title: "Flat []f64 storage",
    desc: "No pointer casting, no strides, no ownership tracking.",
  },
  {
    title: "Copy-based operations",
    desc: "No views. Every op returns fresh memory — simple and safe.",
  },
  {
    title: "Row-major (C-contiguous)",
    desc: "No Fortran order. Upgrade path: strides + [*]u8 + dtype enum when perf demands.",
  },
];

export const roadmap = [
  ["Toolchain setup, hello WASM", "Done"],
  ["NDArray core data structure", "Done"],
  ["Array creation functions", "Done"],
  ["Shape manipulation", "Done"],
  ["Broadcasting", "Done"],
  ["Element-wise operations", "Done"],
  ["Reduction operations", "Done"],
  ["Slicing and indexing", "Done"],
  ["Linear algebra", "Done"],
  ["JS glue library", "Done"],
  ["NumPy-like ops for NN", "Done"],
] as const;
