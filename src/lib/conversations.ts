export type ChatMessage = {
  id: string;
  from: string;
  to: string;
  text?: string;
  image?: string;
  read: boolean;
  createdAt: number;
};
export type ChatPerson = {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  discipline?: string;
};
export function chronological(messages: ChatMessage[]) {
  return [...messages].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
}
export function conversationMessages(
  messages: ChatMessage[],
  me: string,
  other: string,
) {
  return chronological(
    messages.filter(
      (m) =>
        (m.from === me && m.to === other) || (m.from === other && m.to === me),
    ),
  );
}
export function conversationList(
  messages: ChatMessage[],
  people: ChatPerson[],
  me: string,
  selected = "",
) {
  return people
    .filter((p) => p.id !== me)
    .map((person) => {
      const thread = conversationMessages(messages, me, person.id);
      return {
        person,
        last: thread.at(-1),
        unread: thread.filter((m) => m.to === me && !m.read).length,
      };
    })
    .filter((c) => c.last || c.person.id === selected)
    .sort(
      (a, b) =>
        (b.last?.createdAt || 0) - (a.last?.createdAt || 0) ||
        a.person.name.localeCompare(b.person.name),
    );
}
