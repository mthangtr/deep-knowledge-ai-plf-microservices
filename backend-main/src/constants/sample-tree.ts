import { TreeData } from "../types";

/**
 * Defines the ideal JSON structure expected from the LangChain AI service.
 * This serves as a contract for the AI's output.
 *
 * - `topicName`: The main title of the learning path.
 * - `description`: A brief summary of the learning path.
 * - `tree`: An array of node objects.
 *
 * Each node must have:
 * - `temp_id`: A unique temporary string ID to establish relationships before UUIDs are generated.
 * - `parent_id`: The `temp_id` of the parent node to create a hierarchy. `null` for root nodes.
 * - `title`: The node's title.
 * - `description`: A detailed explanation of the node's content.
 * - `prompt_sample`: A sample question to kickstart a chat about this node.
 * - `requires`: An array of `temp_id`s for nodes that are prerequisites (for graph-based dependencies).
 * - `level`: The depth of the node in the tree structure (root is 0).
 */
export const SAMPLE_TREE_DATA: TreeData = {
  topicName: "Học Lập trình TypeScript",
  description:
    "Lộ trình học TypeScript từ cơ bản đến nâng cao, bao gồm các khái niệm cốt lõi, " +
    "tính năng nâng cao và các phương pháp hay nhất.",
  tree: [
    {
      temp_id: "ts_root",
      parent_id: null,
      title: "1. Giới thiệu về TypeScript",
      description:
        "Bắt đầu với những điều cơ bản: TypeScript là gì, tại sao nên sử dụng và cách cài đặt môi trường.",
      prompt_sample: "Tại sao TypeScript lại tốt hơn JavaScript thuần?",
      requires: [],
      level: 0,
    },
    {
      temp_id: "ts_types",
      parent_id: "ts_root",
      title: "2. Các Kiểu Dữ liệu Cơ bản",
      description:
        "Tìm hiểu về các kiểu dữ liệu cốt lõi trong TypeScript như string, number, boolean, array, tuple, và enum.",
      prompt_sample: "Sự khác biệt giữa tuple và array trong TypeScript là gì?",
      requires: ["ts_root"],
      level: 1,
    },
    {
      temp_id: "ts_interfaces",
      parent_id: "ts_root",
      title: "3. Interfaces và Types",
      description:
        "Khám phá cách định hình dữ liệu bằng cách sử dụng interface và type alias. So sánh sự khác biệt và các trường hợp sử dụng.",
      prompt_sample: "Khi nào tôi nên dùng `interface` thay vì `type`?",
      requires: ["ts_root"],
      level: 1,
    },
    {
      temp_id: "ts_functions",
      parent_id: "ts_types",
      title: "4. Functions trong TypeScript",
      description:
        "Học cách định kiểu cho tham số hàm, giá trị trả về và các khái niệm như hàm quá tải (overloads).",
      prompt_sample: "Function overloading hoạt động như thế nào?",
      requires: ["ts_types"],
      level: 2,
    },
    {
      temp_id: "ts_generics",
      parent_id: "ts_interfaces",
      title: "5. Generics Nâng cao",
      description:
        "Làm chủ generics để viết mã linh hoạt, tái sử dụng và an toàn về kiểu cho các thành phần phức tạp.",
      prompt_sample: "Cho tôi một ví dụ thực tế về việc sử dụng Generics.",
      requires: ["ts_interfaces"],
      level: 2,
    },
  ],
};
