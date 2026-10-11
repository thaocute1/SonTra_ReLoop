import React from 'react'

export default function UserAvatar({ initials = 'ST', avatarUrl = '' }) { return <div className="user-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials}</div> }
