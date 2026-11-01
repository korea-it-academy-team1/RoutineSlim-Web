import { apiRequest } from "../../global/api/apiClient";

export function getSavingsSummary() {
  return apiRequest("/api/v1/savings/summary");
}

export function saveGoal(form, tasks, goal) {
  return apiRequest("/api/v1/goals" + (form.id ? "/" + form.id : ""), {
    method: form.id ? "PUT" : "POST",
    body: {
      title: form.title,
      month: form.month,
      target: Number(form.target),
      tasks,
      completed: tasks.map((task) => {
        const index = goal?.tasks?.indexOf(task) ?? -1;
        return index >= 0 ? Boolean(goal.completed?.[index]) : false;
      }),
    },
  });
}

export function addSavingEntry(goal, entry) {
  return apiRequest(`/api/v1/goals/${goal.id}/savings`, {
    method: "POST",
    body: { ...entry, amount: Number(entry.amount) },
  });
}

export function updateGoalTasks(goal, completed) {
  return apiRequest("/api/v1/goals/" + goal.id, {
    method: "PUT",
    body: { ...goal, completed },
  });
}

export function deleteSavingEntry(id) {
  return apiRequest("/api/v1/savings-entries/" + id, { method: "DELETE" });
}

export function deleteGoal(goal) {
  return apiRequest("/api/v1/goals/" + goal.id, { method: "DELETE" });
}

export function getGoalPath(month) {
  return "/api/v1/goals?month=" + month;
}
