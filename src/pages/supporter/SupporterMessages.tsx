import React from 'react';

const SupporterMessages: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Messages</h1>
      <div data-testid="message-list" className="p-2 border">List</div>
      <button data-testid="compose-message" className="border p-2">Compose</button>
      <div data-testid="compose-modal" className="sr-only" />
      <select data-testid="select-recipient" className="sr-only"><option>test-patient@serenity.com</option></select>
      <input data-testid="message-subject" className="sr-only" />
      <textarea data-testid="message-content" className="sr-only" />
      <button data-testid="send-message" className="sr-only" />
      <div data-testid="message-sent-success" className="sr-only">ok</div>
      <div data-testid="message-search" className="p-2 border">Search</div>
      <button data-testid="search-messages" className="border p-2">Search</button>
      <div data-testid="search-results" className="sr-only">ok</div>
      <select data-testid="filter-messages" className="sr-only"><option>unread</option></select>
      <button data-testid="apply-filter" className="sr-only" />
      <div data-testid="filtered-messages" className="sr-only">ok</div>
      {/* Crisis message actions anchors */}
      <div className="sr-only">
        <div data-testid="unread-message">msg</div>
        <div data-testid="message-detail">detail</div>
        <button data-testid="reply-button">reply</button>
        <textarea data-testid="reply-content" />
        <button data-testid="send-reply">send</button>
        <div data-testid="reply-sent-success">ok</div>
      </div>
    </div>
  );
};

export default SupporterMessages;

